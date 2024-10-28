import {promises as fs} from "fs";
import {always} from "../system/config";
import type {LipSyncAnimator, LipSyncResult} from "./LipSyncAnimator";
import {LocalLipSyncResult} from "./LocalLipSyncResult";
import type {Dirent} from "node:fs";
import path from "path";

// TODO use MediaFormat to detect all supported video types' extensions
const hasVideoExt = (filename: string) => path.extname(filename).toLowerCase() === ".mp4";


/**
 * Hacky implementation of LipSync that reuses pre-generated video.
 */
class FakeLipSync implements LipSyncAnimator {
  private readonly lipSyncDataDir: string;

  /**
   * Constructor.
   * @param lipSyncDataDir where to put the video files.
   */
  constructor(lipSyncDataDir: string) {
    this.lipSyncDataDir = lipSyncDataDir;
  }

  canRun = always;

  name(): string {
    return "Fake-LipSync";
  }

  /**
   * Returns an abitrary lip sync video file that was already generated or fails if none exists.
   * @param _imageFile ignored
   * @param _speechFile ignored
   * @param _fileKey ignored
   */
  async animate(_imageFile: string, _speechFile: string, _fileKey: string): Promise<LipSyncResult> {
    const files = await fs.readdir(this.lipSyncDataDir, {withFileTypes: true, recursive: true});
    // TODO remove file extension hard-coding
    const aFile: Dirent | undefined = files.find(f => f.isFile() && hasVideoExt(f.name));
    if (!aFile) {
      return Promise.reject("no lip sync files");
    } else {
      return Promise.resolve(new LocalLipSyncResult(path.join(this.lipSyncDataDir, aFile.name)));
    }
  }

  /** Not supported or required. */
  getMetadata(): string | undefined {
    return undefined;
  }

  getName(): string {
    return this.name();
  }

  /**
   * Unsupported.
   */
  configure(metadata: string): Promise<void> {
    return Promise.reject();
  }

  /**
   * Does nothing.
   */
  writeCacheFile(): Promise<void> {
    return Promise.resolve(undefined);
  }

  free(): boolean {
    return true;
  }

}

export {FakeLipSync};