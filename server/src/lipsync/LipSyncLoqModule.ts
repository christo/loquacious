import {LoqModule} from "../system/LoqModule";
import {WorkflowEvents} from "../system/WorkflowEvents";
import Db from "../db/Db";
import {timed} from "../system/performance";
import {LipSyncAnimator, LipSyncInput, LipSyncResult} from "./LipSyncAnimator";

class LipSyncLoqModule implements LoqModule<LipSyncInput, LipSyncResult> {
  private animator: LipSyncAnimator;
  private workflowEvents: WorkflowEvents;
  private db: Db;

  constructor(lsa: LipSyncAnimator, db: Db, workflowEvents: WorkflowEvents) {
    this.db = db;
    this.animator = lsa;
    this.workflowEvents = workflowEvents;
  }

  async call(input: Promise<LipSyncInput>): Promise<LipSyncResult> {
    try {
      const lsi = await input;
      const animate = () => {
        this.workflowEvents.workflow("lipsync_request");
        return this.animator.animate(lsi.imageFile, Promise.resolve(lsi.speechFile), `${lsi.videoId}`).then(lr => {
          this.workflowEvents.workflow("lipsync_response");
          return lr;
        });
      };
      const resultPromise = timed("lipsync animate", animate);
      const createLipSync = this.db.createLipSync(lsi.creatorId, lsi.ttsId, lsi.videoId);
      const postResponse = this.animator.postResponseHook();
      Promise.all([createLipSync, postResponse]).then(() => {
        console.log("post animate tasks complete");
      }).catch((err) => {
        console.error("Error performing post-animate tasks", err);
      });
      return resultPromise;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }
}

export {LipSyncLoqModule};