import {fal} from "@fal-ai/client";
import {promises as fs} from "fs";
import type {LipSync, LipSyncResult} from "LipSync";

async function readBinaryFile(filePath: string): Promise<File> {
  const fileBuffer = await fs.readFile(filePath);

  // Get the file name from the path
  const fileName = filePath.split('/').pop()!;

  // Create a File object (with fetch-blob)
  return new File([fileBuffer], fileName, {type: 'application/octet-stream'});
}

class FalService implements LipSync {
  private static SADTALKER_ENDPOINT: string = "fal-ai/sadtalker";

  constructor() {
    fal.config({
      credentials: process.env.FAL_API_KEY,
    });
  }

  async lipSync(img: string, speech: string): Promise<LipSyncResult> {
    console.log(img, speech);
    const imgUrl = await fal.storage.upload(await readBinaryFile(img));
    const speechUrl = await fal.storage.upload(await readBinaryFile(speech));

    const result = await fal.run(FalService.SADTALKER_ENDPOINT,{
      input: {
        source_image_url: imgUrl,
        driven_audio_url: speechUrl
      }});
    console.dir(result);
    return {};
  }
}
