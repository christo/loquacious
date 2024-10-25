import {fal, type Result} from "@fal-ai/client";
import {promises as fs} from "fs";
import type {LipSync, LipSyncResult} from "lipsync/LipSync";
import {SadTalkerResult} from "lipsync/SadTalkerResult";
import type {PathLike} from "node:fs";
import path from "path";
import {mkDirIfMissing} from "system/config";
import {timed} from "system/performance";

async function readBinaryFile(filePath: string): Promise<File> {
  const fileBuffer = await fs.readFile(filePath);
  const fileName = filePath.split('/').pop()!;
  return new File([fileBuffer], fileName, {type: 'application/octet-stream'});
}

/**
 * Just the config part of the invocation params, excluding those that change on every call.
 */
type FalSadtalkerInput = {
    pose_style: number,             // 0-45 integer
    face_model_resolution: "256" | "512",    // string "256" or "512"
    expression_scale: number,      // 0-3 float
    face_enhancer?: 'gfpgan' | undefined,       // blank or only option - always seems to fail
    still_mode: boolean,             // whether to use few head movements
    preprocess: "crop" | "extcrop" | "resize" | "full" | "extfull",            // crop, extcrop, resize, full, extfull
}

/**
 * Goes inside an object with key "input" to perform an actual API invocation.
 */
type FalSadtalkerInvocationInput = {source_image_url: string, driven_audio_url: string} & FalSadtalkerInput;

/**
 * Implementation that calls fal.ai service, requires valid FAL_API_KEY in env.
 */
class FalSadtalker implements LipSync {
  private static SADTALKER_ENDPOINT: string = "fal-ai/sadtalker";
  private static NAME = "FalSadtalker";
  private readonly dataDir: string;
  private urlCache: { [keyOf: string]: string } = {};
  private sadtalkerConfig: FalSadtalkerInput = {
    pose_style: 20,             // 0-45 integer
    face_model_resolution: "256",    // string "256" or "512"
    expression_scale: 1.4,      // 0-3 float
    still_mode: false,             // whether to use few head movements
    preprocess: "full",            // crop, extcrop, resize, full, extfull
  };

  /**
   * Constructor.
   * @param lipSyncDataDir base directory for all lipsync videos, creates its own subdir.
   */
  constructor(lipSyncDataDir: PathLike) {
    this.dataDir = path.join(lipSyncDataDir.toString(), "fal-sadtalker");
    mkDirIfMissing(this.dataDir);
    fal.config({
      credentials: process.env.FAL_API_KEY,
    });
  }

  name(): string {
    return FalSadtalker.NAME;
  }

  async urlFor(filePath: string): Promise<string> {
    const fileUrl = this.urlCache[filePath];
    if (fileUrl) {
      console.log(`file URL found in cache: ${fileUrl}`);
    } else {
      await timed(`fal upload ${filePath.split(path.sep).pop()}`, async () => {
        this.urlCache[filePath] = await fal.storage.upload(await readBinaryFile(filePath));
      });
    }
    return this.urlCache[filePath];
  }

  async lipSync(img: string, speech: string): Promise<LipSyncResult> {
    const imgUrl = await this.urlFor(img);
    const speechUrl = await this.urlFor(speech);
    const result: Result<{ video: SadTalkerResult }> = await timed("fal run sadtalker",
      async () => await fal.run(FalSadtalker.SADTALKER_ENDPOINT,
        {input: this.sadtalkerParams(imgUrl, speechUrl)
        }));
    return timed("fal sadtalker video download", async () => {
      const r = result.data.video;
      const videoDownload = await fetch(r.url);
      const buffer = await videoDownload.arrayBuffer();
      const downloadedVideo = path.join(this.dataDir, r.file_name);
      await fs.writeFile(downloadedVideo, Buffer.from(buffer));
      return new SadTalkerResult(r.url, r.content_type, r.file_name, r.file_size, downloadedVideo);
    });
  }

  getMetadata(): string | undefined {
    return JSON.stringify(this.sadtalkerConfig);
  }

  getName(): string {
    return this.name();
  }

  configure(metadata: string): Promise<void> {
    try {
      this.sadtalkerConfig = JSON.parse(metadata);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  private sadtalkerParams(imgUrl: string, speechUrl: string): FalSadtalkerInvocationInput {
    return {
        source_image_url: imgUrl,
        driven_audio_url: speechUrl,
        ...this.sadtalkerConfig
    };
  }
}

export {FalSadtalker};