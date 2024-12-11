import {LoqModule} from "../system/LoqModule";
import Db from "../db/Db";
import {WorkflowEvents} from "../system/WorkflowEvents";
import {SpeechInput, SpeechResult, SpeechSystem} from "./SpeechSystem";

class TtsLoqModule implements LoqModule<SpeechInput, SpeechResult> {
  private readonly speechSystem: SpeechSystem;
  private db: Db;
  private workflowEvents: WorkflowEvents;

  constructor(ss: SpeechSystem, db: Db, workflowEvents: WorkflowEvents) {
    this.speechSystem = ss;
    this.db = db;
    this.workflowEvents = workflowEvents;
  }

  async call(input: Promise<SpeechInput>): Promise<SpeechResult> {
    try {
      this.workflowEvents.workflow("tts_request");
      const speechInput = await input;
      return this.speechSystem.speak(speechInput.getText(), speechInput.getBaseFileName()).then(x => {
        this.workflowEvents.workflow("tts_response");
        return x;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }
}

export {TtsLoqModule};