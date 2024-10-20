import {fal, type Result} from "@fal-ai/client";
import {promises as fs} from "fs";
import type {LipSync, LipSyncResult} from "LipSync";
import path from "path";
import {timed} from "performance";

class SadTalkerLipSyncResult implements LipSyncResult {
  readonly url: string;
  readonly content_type: string;
  readonly file_name: string;
  readonly file_size: number;
  readonly videoPath: string;

  constructor(url: string, content_type: string, file_name: string, file_size: number, videoPath: string) {
    this.url = url;
    this.content_type = content_type;
    this.file_name = file_name;
    this.file_size = file_size;
    this.videoPath = videoPath;
  }

  getContentType(): string {
    return this.content_type;
  }

  getFileName(): string {
    return this.file_name;
  }

  getFileSize(): number {
    return this.file_size;
  }

  getVideoUrl(): string {
    return this.url;
  }

  getVideoPath(): string {
    return this.videoPath;
  }
}

async function readBinaryFile(filePath: string): Promise<File> {
  const fileBuffer = await fs.readFile(filePath);

  // Get the file name from the path
  const fileName = filePath.split('/').pop()!;

  // Create a File object (with fetch-blob)
  return new File([fileBuffer], fileName, {type: 'application/octet-stream'});
}

class FalService implements LipSync {
  private static SADTALKER_ENDPOINT: string = "fal-ai/sadtalker";
  private readonly lipSyncDataDir: string;
  private urlCache : {[keyOf: string]: string} = {};

  constructor(lipSyncDataDir: string) {
    this.lipSyncDataDir = lipSyncDataDir;
    fal.config({
      credentials: process.env.FAL_API_KEY,
    });
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
    const result: Result<{ video: SadTalkerLipSyncResult }> = await timed(
      "fal run sadtalker",
      async () => await fal.run(FalService.SADTALKER_ENDPOINT, this.sadtalkerParams(imgUrl, speechUrl)));
    return timed("fal sadtalker video download", async () => {
      const r = result.data.video;
      const videoDownload = await fetch(r.url);
      const buffer = await videoDownload.arrayBuffer();
      const downloadedVideo = path.join(this.lipSyncDataDir, r.file_name);
      await fs.writeFile(downloadedVideo, Buffer.from(buffer));
      return new SadTalkerLipSyncResult(r.url, r.content_type, r.file_name, r.file_size, downloadedVideo);
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

export {FalService};