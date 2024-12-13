import {LoqModule} from "../system/LoqModule";
import {WorkflowEvents} from "../system/WorkflowEvents";
import Db from "../db/Db";
import {timed} from "../system/performance";
import {Animator, LipSyncInput, LipSyncResult} from "./Animator";

class LipSyncLoqModule implements LoqModule<LipSyncInput, LipSyncResult> {
  private animator: Animator;
  private workflowEvents: WorkflowEvents;
  private db: Db;

  constructor(lsa: Animator, db: Db, workflowEvents: WorkflowEvents) {
    this.db = db;
    this.animator = lsa;
    this.workflowEvents = workflowEvents;
  }

  async call(input: Promise<LipSyncInput>): Promise<LipSyncResult> {
    try {
      const lsi = await input;
      const animate = () => {
        const speechFile = Promise.resolve(lsi.speechFile);
        this.workflowEvents.workflow("lipsync_request");
        return this.animator.animate(lsi.imageFile, speechFile, `${lsi.videoId}`).then(lr => {
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