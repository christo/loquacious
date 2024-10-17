import path from "path";
import sharp from 'sharp';

class ImageInfo {
  f: string;
  w: number;
  h: number;

  constructor(f: string, w: number, h: number) {
    this.f = f;
    this.w = w;
    this.h = h;
  }
  static async fromFile(baseDir: string, relativePath: string): Promise<ImageInfo> {

    const image = sharp(path.join(baseDir, relativePath).toString());
    const metadata = await image.metadata();

    if (metadata.width && metadata.height) {
      return new ImageInfo(relativePath, metadata.width, metadata.height);
    }

    throw new Error('Unable to determine image dimensions');
  }
}

export {ImageInfo};