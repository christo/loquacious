import type {MediaFormat} from "../media";
import type {CreatorService} from "../system/CreatorService";

/**
 * Output of calling {@LipSync} to generate a video.
 */
type AnimatorResult = {
  /** Mime-Type of generated video */
  getContentType(): string;
  /** File name of generated video */
  getFileName(): string;
  /** File size of generated video */
  getFileSize(): number;
  /** Local relative path on server of video */
  getVideoPath(): string;
}

type AnimatorInput = {
  imageFile: string;
  speechFile: string | undefined
  fileKey: string;
  creatorId: number;
  ttsId: number;
  videoId: number;
}

/**
 * Service that can create animation video from portrait image and speech audio.
 */
interface Animator extends CreatorService {

  /**
   * Generate a video animating the given portrait image to speak the given spoken audio.
   * Save it in the correctly configured data directory and return a LipSyncResult for it.
   * @param imageFile
   * @param speechFile
   * @param fileKey unique database id to use as unique key in filename
   */
  animate(imageFile: string, speechFile: Promise<string | undefined>, fileKey: string): Promise<AnimatorResult>;

  /**
   * Give implementations an opportunity to do non-critical-path work that will not delay user response.
   */
  postResponseHook(): Promise<void>;

  /**
   * Declare the output format.
   */
  videoOutputFormat(): MediaFormat | undefined;

}

export type {Animator, AnimatorResult, AnimatorInput};
