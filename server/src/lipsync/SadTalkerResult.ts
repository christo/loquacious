import type {AnimatorResult} from "lipsync/Animator";

export class SadTalkerResult implements AnimatorResult {
  readonly url: string;
  readonly content_type: string;
  readonly file_name: string;
  readonly file_size: number;
  readonly videoPath: string;

  constructor(url: string, content_type: string, file_name: string, file_size: number, videoPath: string) {
    this.url = url;
    this.content_type = content_type;
    this.file_name = file_name;
    this.file_size = file_size;
    this.videoPath = videoPath;
  }

  getContentType(): string {
    return this.content_type;
  }

  getFileName(): string {
    return this.file_name;
  }

  getFileSize(): number {
    return this.file_size;
  }

  getVideoUrl(): string {
    return this.url;
  }

  getVideoPath(): string {
    return this.videoPath;
  }
}