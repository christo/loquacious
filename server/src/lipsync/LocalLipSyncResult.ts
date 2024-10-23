import fs from 'fs';
import {extToFormat} from "../media";
import type {PathLike} from "node:fs";
import {basename} from 'path';
import type {LipSyncResult} from "./LipSync";

/**
 * Lip sync result that plays an existing video.
 *
 */
class LocalLipSyncResult implements LipSyncResult{
  // TODO a LipSyncResult should be more generic - InteractionResult? which may or may not have text, audio and video
  //   and the front-end should handle the interaction appropriately. Good for turning off video-generation for testing.
  private readonly size: number;
  private readonly name: string;
  private readonly contentType: string;
  private readonly videoPath: string;

  constructor(filePath: PathLike) {
    this.videoPath = filePath.toString();
    this.size = fs.statSync(filePath).size;
    const filename = basename(filePath.toString());
    this.name = filename;
    this.contentType = extToFormat(filename)!.mimeType;
  }

  getContentType(): string {
    return this.contentType;
  }

  getFileName(): string {
    return this.name;
  }

  getFileSize(): number {
    return this.size;
  }

  getVideoPath(): string {
    return this.videoPath;
  }

}

export {LocalLipSyncResult};