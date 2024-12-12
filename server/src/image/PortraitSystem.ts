import {Dimension} from "./Dimension";
import {ImageInfo} from "./ImageInfo";
import {prescaleImages} from "./imageOps";
import path from "path";

export class PortraitSystem {
  private readonly baseWebRoot: string;
  private readonly basePortraitPath: string;
  /** in principle this could be changed at runtime */
  private dimIndex = 0;

  private PORTRAIT_DIMS: Dimension[] = [
    {width: 608, height: 800},
    {width: 1080, height: 1920}
  ];

  constructor(baseWebRoot: string) {
    this.baseWebRoot = baseWebRoot;
    this.basePortraitPath = `${baseWebRoot}/img`;
    console.log(`path portrait: ${this.path()}`);
  }

  baseUrl = () => {
    const dim = this.dimension();
    return `/img/${dim.width}x${dim.height}`;
  };

  /** file path relative to server module root */
  path = () => `${this.baseWebRoot}${this.baseUrl()}`;

  dimension = () =>this.PORTRAIT_DIMS[this.dimIndex];

  getPortraitPath = (portrait: ImageInfo) => path.join(this.path(), portrait.f).toString();

  async prescaleImages() {
    await prescaleImages(this.path(), this.PORTRAIT_DIMS)
  }
}