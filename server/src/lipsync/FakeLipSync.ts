import fs, {promises as fs} from "fs";
import type {LipSync, LipSyncResult} from "./LipSync";
import {LocalLipSyncResult} from "./LocalLipSyncResult";
import type {Dirent} from "node:fs";
import path from "path";

/**
 * Hacky implementation of LipSync that reuses pre-generated video.
 */
class FakeLipSync implements LipSync {
  private readonly lipSyncDataDir: string;

  /**
   * Constructor.
   * @param lipSyncDataDir where to put the video files.
   */
  constructor(lipSyncDataDir: string) {
    this.lipSyncDataDir = lipSyncDataDir;
  }

  name(): string {
    return "Fake-LipSync";
  }

  /**
   * Returns an abitrary lip sync video file that was already generated or fails if none exists.
   * @param _imageFile ignored
   * @param _speechFile ignored
   */
  async lipSync(_imageFile: string, _speechFile: string): Promise<LipSyncResult> {
    const files = await fs.readdir(this.lipSyncDataDir, {withFileTypes: true, recursive: true});
    // STTCPW
    const aFile: Dirent | undefined = files.find(f => f.isFile() && path.extname(f.name).toLowerCase() === ".mp4");
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