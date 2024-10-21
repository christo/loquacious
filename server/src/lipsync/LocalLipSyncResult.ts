import fs from 'fs';
import {extToFormat} from "../media";
import type {PathLike} from "node:fs";
import {basename} from 'path';
import type {LipSyncResult} from "./LipSync";

class LocalLipSyncResult implements LipSyncResult{
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