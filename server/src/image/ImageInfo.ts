import path from "path";
import sharp from 'sharp';

/**
 * Compact convenience class for carrying image metadata.
 */
class ImageInfo {

  /**
   * File path for this image.
   */
  readonly f: string;

  /**
   * Width in pixels.
   */
  readonly w: number;

  /**
   * Height in pixels.
   */
  readonly h: number;

  /**
   * Construct {@ImageInfo} with given metadata.
   *
   * @param f filepath
   * @param w pixel width
   * @param h pixel height
   */
  constructor(f: string, w: number, h: number) {
    this.f = f;
    this.w = w;
    this.h = h;
  }

  /**
   * Make an instance using an existing image file at the given path.
   * @param baseDir base directory for relative path.
   * @param relativePath subpath of baseDir to the image file.
   */
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