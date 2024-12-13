import {Dimension} from "./Dimension";
import {ImageInfo} from "./ImageInfo";
import {prescaleImages} from "./imageOps";
import path from "path";

/**
 * Manages a directory of portraits that are to be served from a URL,
 * will rescale original images to configured dimensions.
 */
export class PortraitSystem {
  private readonly baseWebRoot: string;
  private readonly basePortraitPath: string;
  /** in principle this could be changed at runtime */
  private dimIndex = 0;

  private PORTRAIT_DIMS: Dimension[] = [
    {width: 608, height: 800},
    {width: 1080, height: 1920}
  ];

  /**
   * Construct PortraitSystem at the given dir.
   * @param dir where the image files are.
   */
  constructor(dir: string) {
    this.baseWebRoot = dir;
    this.basePortraitPath = `${dir}/img`;
  }

  /**
   * The url for the images at the configured scale.
   */
  baseUrl = () => {
    const dim = this.dimension();
    return `/img/${dim.width}x${dim.height}`;
  };

  /** file path relative to server module root */
  basePath = () => `${this.baseWebRoot}${this.baseUrl()}`;

  /**
   * Supplies the currently configured {@link Dimension}.
   */
  dimension = () =>this.PORTRAIT_DIMS[this.dimIndex];

  /**
   * Gets the path for a given portrait
   * @param portrait the ImageInfo of a portrait
   */
  getPath = (portrait: ImageInfo) => path.join(this.basePath(), portrait.f).toString();

  /**
   * Create scaled versions for each image file in the configured directory
   */
  async prescaleImages() {
    await prescaleImages(this.basePath(), this.PORTRAIT_DIMS)
  }
}