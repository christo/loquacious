import {fal, type Result} from "@fal-ai/client";
import {promises as fs} from "fs";
import type {LipSync, LipSyncResult} from "LipSync";
import path from "path";
import {timed} from "performance";

class SadTalkerLipSyncResult implements LipSyncResult {
  url: string;
  content_type: string;
  file_name: string;
  file_size: number;

  constructor(url: string, content_type: string, file_name: string, file_size: number) {
    this.url = url;
    this.content_type = content_type;
    this.file_name = file_name;
    this.file_size = file_size;
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

  constructor(lipSyncDataDir: string) {
    this.lipSyncDataDir = lipSyncDataDir;
    fal.config({
      credentials: process.env.FAL_API_KEY,
    });
  }

  async lipSync(img: string, speech: string): Promise<LipSyncResult> {
    //console.log(img, speech);
    const imgFile = await readBinaryFile(img);
    //console.log(`imgFile.size: ${imgFile.size}`);
    const imgUrl = await timed<string>("fal upload image", () => fal.storage.upload(imgFile));
    //console.log(`imgUrl: ${imgUrl}`);
    const speechFile = await readBinaryFile(speech);
    //console.log(`speechFile.size: ${speechFile.size}`);
    const speechUrl = await timed<string>("fal upload speech", () => fal.storage.upload(speechFile));
    //console.log(`speechUrl: ${speechUrl}`);

    const result: Result<{
      video: SadTalkerLipSyncResult
    }> = await timed("fal run sadtalker", () => fal.run(FalService.SADTALKER_ENDPOINT, {
      input: {
        source_image_url: imgUrl,
        driven_audio_url: speechUrl,
        // pose_style: 14,             // 0-45 integer
        face_model_resolution: "512",    // string 256 or 512
        expression_scale: 1.4,      // 0-3 float
        face_enhancer: 'gfpgan',       // blank or only option - not sure of impact
        still_mode: false,             // whether to use few head movements
        preprocess: "full",            // crop, extcrop, resize, full, extfull
      }
    }));
    console.log("sadtalker result from fal");
    const lipSyncResult = result.data.video as SadTalkerLipSyncResult;
    const videoUrl = await fetch(lipSyncResult.getVideoUrl());
    const buffer = await videoUrl.arrayBuffer();
    await fs.writeFile(path.join(this.lipSyncDataDir, lipSyncResult.getFileName()), Buffer.from(buffer));
    return lipSyncResult;
  }
}

export {FalService};