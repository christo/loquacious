import {promises as fs} from "fs";
import {type MediaFormat, supportedImageTypes} from "media";
import path from "path";
import sharp from "sharp";

import {mkDirIfMissing} from "../system/filetoy";

type Dim = {
  width: number,
  height: number
}

export async function prescaleImages(baseDir: string, dimensions: Dim[]) {
  const extensions: string[] = supportedImageTypes()
    .flatMap((f: MediaFormat) => f.extensions)
    .map((e: string) => `.${e}`);
  for (const dimension of dimensions) {
    const dimDir = `${baseDir}/${dimension.width}x${dimension.height}`;
    console.log(`prescaling images to ${dimDir}`);
    mkDirIfMissing(dimDir);
    const files = await fs.readdir(baseDir, {withFileTypes: true});
    for (const file of files) {
      if (file.isFile() && extensions.includes(path.extname(file.name).toLowerCase())) {
        // got suitable image file, resize it
        const destFile = path.join(dimDir, file.name);
        // skip if the file already exists
        fs.access(destFile, fs.constants.R_OK | fs.constants.W_OK).then(null, async () => {
          // resize images to width, preserving aspect ratio
          await sharp(path.join(baseDir, file.name))
            .resize(dimension.width, null)
            .toFile(destFile)
        });
      }
    }
  }
}

export type {Dim};