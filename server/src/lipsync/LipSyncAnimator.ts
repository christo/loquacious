import type {ConfigurableCreator} from "../domain/ConfigurableCreator";
import type {CreatorType} from "../domain/CreatorType";

/**
 * Output of calling {@LipSync} to generate a video.
 */
type LipSyncResult = {
  /** Mime-Type of generated video */
  getContentType(): string;
  /** File name of generated video */
  getFileName(): string;
  /** File size of generated video */
  getFileSize(): number;
  /** Local relative path on server of video */
  getVideoPath(): string;
}

/**
 * Service that can create animation video from portrait image and speech audio.
 */
interface LipSyncAnimator extends CreatorType, ConfigurableCreator {

  /** Unique name for the service. */
  name(): string;

  /**
   * Generate a video animating the given portrait image to speak the given spoken audio.
   * Save it in the correctly configured data directory and return a LipSyncResult for it.
   * @param imageFile
   * @param speechFile
   * @param fileKey unique database id to use as unique key in filename
   */
  animate(imageFile: string, speechFile: string, fileKey: string): Promise<LipSyncResult>;

  writeCacheFile(): Promise<void>
}

export type {LipSyncAnimator, LipSyncResult};