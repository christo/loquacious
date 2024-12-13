import {fal, type Result} from "@fal-ai/client";
import {promises, readFileSync} from "fs";
import {Animator, LipSyncResult} from "lipsync/Animator";
import {SadTalkerResult} from "lipsync/SadTalkerResult";
import {type PathLike, writeFileSync} from "node:fs";
import path from "path";
import {timed} from "system/performance";
import {type MediaFormat, MF_MP4} from "../media";
import {hasEnv} from "../system/config";
import {mkDirIfMissing} from "../system/filetoy";


async function readBinaryFile(filePath: string): Promise<File> {
  const fileBuffer = await promises.readFile(filePath);
  const fileName = filePath.split('/').pop()!;
  return new File([fileBuffer!], fileName, {type: 'application/octet-stream'});
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
type FalSadtalkerInvocation = {
  input: { source_image_url: string, driven_audio_url: string } & FalSadtalkerInput
};

const MS_MIN = 60 * 1000;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;
const CACHE_EXPIRY_MS = 5 * MS_DAY;

/**
 * filepath: [url, isoDatestamp]
 */
type UrlCache = { [keyof: string]: [string, string] };


/**
 * Implementation that calls fal.ai service, requires valid FAL_API_KEY in env.
 */
class FalSadtalker implements Animator {
  private static SADTALKER_ENDPOINT: string = "fal-ai/sadtalker";
  canRun = hasEnv("FAL_API_KEY");
  private readonly name = "FalSadtalker";
  private readonly dataDir: string;
  private readonly urlCache: UrlCache;
  private sadtalkerConfig: FalSadtalkerInput = {
    pose_style: 20,             // 0-45 integer
    face_model_resolution: "256",    // string "256" or "512"
    expression_scale: 1.4,      // 0-3 float
    still_mode: false,             // whether to use few head movements
    preprocess: "full",            // crop, extcrop, resize, full, extfull
  };
  private readonly urlCacheFile: string;

  /**
   * Constructor.
   * @param lipSyncDataDir base directory for all lipsync videos, creates its own subdir.
   */
  constructor(lipSyncDataDir: PathLike) {
    this.dataDir = path.join(lipSyncDataDir.toString(), "fal-sadtalker");
    mkDirIfMissing(this.dataDir);
    this.urlCacheFile = path.join(this.dataDir, "url.cache.json");
    try {
      this.urlCache = JSON.parse(readFileSync(this.urlCacheFile, 'utf-8').toString());
    } catch (error: unknown) {
      console.warn(`Cannot read ${this.urlCacheFile}`);
      this.urlCache = {};
    }
    fal.config({
      credentials: process.env.FAL_API_KEY,
    });
  }

  getName(): string {
    return this.name;
  }

  /**
   * Get the fal accessible stored url for the given local filePath, reusing any previous unexpired cached value,
   * skipping the step of uploading the portrait image.
   * @param imageFilePath
   */
  async urlFor(imageFilePath: string): Promise<string> {
    if (!this.urlCache[imageFilePath] || this.expired(imageFilePath)) {
      await timed(`upload image file to fal.ai ${imageFilePath.split(path.sep).pop()}`, async () => {
        this.urlCache[imageFilePath] = [
          await fal.storage.upload(await readBinaryFile(imageFilePath)),
          new Date().toISOString()
        ];
      });
    }
    return this.urlCache[imageFilePath][0];
  }

  async animate(img: string, speech: Promise<string>, filekey: string): Promise<LipSyncResult> {
    const imgUrl = await this.urlFor(img);
    // don't bother caching speech, reuse is vanishingly rare
    const speechUrl = await timed("upload speech file to fal.ai",
        async () => fal.storage.upload(await readBinaryFile(await speech)));
    const result: Result<{ video: SadTalkerResult }> = await timed("fal run sadtalker",
        async () => {
          return await fal.run(FalSadtalker.SADTALKER_ENDPOINT, this.sadtalkerParams(imgUrl, speechUrl))
        }
    );
    return timed(
        "fal sadtalker video download",
        async () => {
          const r = result.data.video;
          const videoDownload = await fetch(r.url);
          const buffer = await videoDownload.arrayBuffer();
          const filename = `falst_${filekey}_${(r.file_name)}`;
          const filepath = path.join(this.dataDir, filename);
          writeFileSync(filepath, Buffer.from(buffer));
          return new SadTalkerResult(r.url, r.content_type, filename, r.file_size, filepath);
        });
  }

  /**
   * Writes cache file to disk.
   */
  async postResponseHook(): Promise<void> {
    try {
      return promises.writeFile(this.urlCacheFile, JSON.stringify(this.urlCache), 'utf-8');
    } catch (error: unknown) {
      console.error(`Error occurred while writing ${this.urlCacheFile}`, error);
      return Promise.reject(error);
    }
  }

  getMetadata(): string | undefined {
    return JSON.stringify(this.sadtalkerConfig);
  }

  configure(metadata: string): Promise<void> {
    try {
      this.sadtalkerConfig = JSON.parse(metadata);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  free(): boolean {
    return false;
  }

  videoOutputFormat(): MediaFormat {
    return MF_MP4;
  }

  private expired(filePath: string) {
    return Date.parse(this.urlCache[filePath][1]) + CACHE_EXPIRY_MS < Date.now();
  }

  private sadtalkerParams(imgUrl: string, speechUrl: string): FalSadtalkerInvocation {
    return ({
      input: {
        source_image_url: imgUrl,
        driven_audio_url: speechUrl,
        ...this.sadtalkerConfig
      }
    });
  }
}

export {FalSadtalker};