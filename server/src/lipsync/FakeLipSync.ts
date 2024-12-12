import {promises} from "fs";
import type {Dirent} from "node:fs";
import path from "path";
import {hasVideoExt, type MediaFormat, MF_MP4} from "../media";
import {always} from "../system/config";
import {LipSyncAnimator, LipSyncResult} from "./LipSyncAnimator";
import {LocalLipSyncResult} from "./LocalLipSyncResult";


/**
 * Hacky implementation of LipSync that reuses pre-generated video.
 */
class FakeLipSync implements LipSyncAnimator {
  canRun = always;
  private readonly lipSyncDataDir: string;

  /**
   * Constructor.
   * @param lipSyncDataDir where to put the video files.
   */
  constructor(lipSyncDataDir: string) {
    // because this reuses other lipsync videos it doesn't have its own subdir
    this.lipSyncDataDir = lipSyncDataDir;
  }

  getName(): string {
    return "Fake-LipSync";
  }

  /**
   * Returns an abitrary lip sync video file that was already generated or fails if none exists.
   * @param _imageFile ignored
   * @param _speechFile ignored
   * @param _fileKey ignored
   */
  async animate(_imageFile: string, _speechFile: Promise<string>, _fileKey: string): Promise<LipSyncResult> {
    const files = await promises.readdir(this.lipSyncDataDir, {withFileTypes: true, recursive: true});
    const aFile: Dirent | undefined = files.find(f => f.isFile() && hasVideoExt(f.name));
    if (!aFile) {
      return Promise.reject("no lip sync files");
    } else {
      return Promise.resolve(new LocalLipSyncResult(path.join(aFile.parentPath, aFile.name)));
    }
  }

  /** Not supported or required. */
  getMetadata(): string | undefined {
    return undefined;
  }

  /**
   * Unsupported.
   */
  configure(_metadata: string): Promise<void> {
    return Promise.reject();
  }

  /**
   * Does nothing.
   */
  postResponseHook(): Promise<void> {
    return Promise.resolve(undefined);
  }

  free(): boolean {
    return true;
  }

  videoOutputFormat(): MediaFormat {
    // apparently
    return MF_MP4;
  }
}

export {FakeLipSync};