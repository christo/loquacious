import type {MediaFormat} from "../media";
import type {CreatorService} from "../system/CreatorService";
import {EventChannel, EventEmitter, LoqEvent} from "../system/EventEmitter";
import {LoqModule} from "../system/LoqModule";
import Db from "../db/Db";
import {StreamServer} from "../StreamServer";
import {WorkflowEvents} from "../system/WorkflowEvents";

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

type LipSyncInput = {
  imageFile: string;
  speechFile: string | undefined
  fileKey: string;
}

class LipSyncLoqModule implements LoqModule<LipSyncInput, LipSyncResult> {
  private _lsa: LipSyncAnimator;
  private _workflowEvents: WorkflowEvents;

  constructor(lsa: LipSyncAnimator, db: Db, workflowEvents: WorkflowEvents) {
    this._lsa = lsa;
    this._workflowEvents = workflowEvents;
  }

  async call(input: Promise<LipSyncInput>): Promise<LipSyncResult> {
    try {
      // TODO check the sequencing logic of firing these workflow events
      this._workflowEvents.workflow("lipsync_request");
      const lipSyncInput = await input;
      return this._lsa.animate(lipSyncInput.imageFile, input.then(lsi => lsi.speechFile), lipSyncInput.fileKey).then(x => {
        this._workflowEvents.workflow("lipsync_response");
        return x;
      });
    } catch(error) {
      return Promise.reject(error);
    }
  }
}

/**
 * Service that can create animation video from portrait image and speech audio.
 */
interface LipSyncAnimator extends CreatorService {

  /**
   * Generate a video animating the given portrait image to speak the given spoken audio.
   * Save it in the correctly configured data directory and return a LipSyncResult for it.
   * @param imageFile
   * @param speechFile
   * @param fileKey unique database id to use as unique key in filename
   */
  animate(imageFile: string, speechFile: Promise<string | undefined>, fileKey: string): Promise<LipSyncResult>;

  /**
   * Give implementations an opportunity to do non-critical-path work that will not delay user response.
   */
  postResponseHook(): Promise<void>;

  /**
   * Declare the output format.
   */
  videoOutputFormat(): MediaFormat | undefined;

}

export type {LipSyncAnimator, LipSyncResult, LipSyncInput};
export {LipSyncLoqModule};