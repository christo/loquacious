import {fal, type Result} from "@fal-ai/client";
import {promises as fs} from "fs";
import type {LipSync, LipSyncResult} from "lipsync/LipSync";
import {SadTalkerResult} from "lipsync/SadTalkerResult";
import path from "path";
import {timed} from "system/performance";

async function readBinaryFile(filePath: string): Promise<File> {
  const fileBuffer = await fs.readFile(filePath);

  // Get the file name from the path
  const fileName = filePath.split('/').pop()!;

  // Create a File object (with fetch-blob)
  return new File([fileBuffer], fileName, {type: 'application/octet-stream'});
}

class FalSadtalker implements LipSync {
  private static SADTALKER_ENDPOINT: string = "fal-ai/sadtalker";
  private readonly lipSyncDataDir: string;
  private urlCache: { [keyOf: string]: string } = {};

  /**
   * Constructor.
   * @param lipSyncDataDir where to put the video files.
   */
  constructor(lipSyncDataDir: string) {
    this.lipSyncDataDir = lipSyncDataDir;
    fal.config({
      credentials: process.env.FAL_API_KEY,
    });
  }

  name(): string {
    return "fal.ai SadTalker Lip Sync";
  }


  async urlFor(filePath: string): Promise<string> {
    const fileUrl = this.urlCache[filePath];
    if (!fileUrl) {
      await timed("fal upload image", async () => {
        this.urlCache[filePath] = await fal.storage.upload(await readBinaryFile(filePath));
      });
    }
    return this.urlCache[filePath];
  }

  async lipSync(img: string, speech: string): Promise<LipSyncResult> {
    const imgUrl = await this.urlFor(img);
    const speechUrl = await this.urlFor(speech);
    const result: Result<{ video: SadTalkerResult }> = await timed(
      "fal run sadtalker",
      async () => await fal.run(FalSadtalker.SADTALKER_ENDPOINT, this.sadtalkerParams(imgUrl, speechUrl)));
    return timed("fal sadtalker video download", async () => {
      const r = result.data.video;
      const videoDownload = await fetch(r.url);
      const buffer = await videoDownload.arrayBuffer();
      const downloadedVideo = path.join(this.lipSyncDataDir, r.file_name);
      await fs.writeFile(downloadedVideo, Buffer.from(buffer));
      return new SadTalkerResult(r.url, r.content_type, r.file_name, r.file_size, downloadedVideo);
    });
  }

  private sadtalkerParams(imgUrl: string, speechUrl: string) {
    return {
      input: {
        source_image_url: imgUrl,
        driven_audio_url: speechUrl,
        pose_style: 24,             // 0-45 integer
        face_model_resolution: "256",    // string "256" or "512"
        expression_scale: 1.4,      // 0-3 float
        //face_enhancer: 'gfpgan',       // blank or only option - not sure of impact
        still_mode: true,             // whether to use few head movements
        preprocess: "extfull",            // crop, extcrop, resize, full, extfull
      }
    };
  }
}

export {FalSadtalker};