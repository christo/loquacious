type LipSyncResult = {
  getVideoUrl(): string;
  getContentType(): string;
  getFileName(): string;
  getFileSize(): number;
  /** Local relative path on server of video */
  getVideoPath(): string;
}

interface LipSync {

  /**
   * Generate a video animating the given portrait image to speak the given spoken audio.
   * Save it in the correctly configured data directory and return a LipSyncResult for it.
   * @param imageFile
   * @param speechFile
   */
  lipSync(imageFile: string, speechFile: string): Promise<LipSyncResult>;

}

export type {LipSync, LipSyncResult};