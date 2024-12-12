import {LoqModule} from "../system/LoqModule";
import Db from "../db/Db";
import {WorkflowEvents} from "../system/WorkflowEvents";
import {SpeechSystem} from "./SpeechSystem";
import type {AudioFile} from "../domain/AudioFile";
import {SpeechResult} from "./SpeechResult";
import {SpeechInput} from "./SpeechInput";

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
      const ssCreator = await this.db.findCreatorForService(this.speechSystem);
      const mimeType = this.speechSystem.speechOutputFormat().mimeType;
      const audioFile: AudioFile = await this.db.createAudioFile(mimeType, ssCreator.id);
      const si = await input;
      this.workflowEvents.workflow("tts_request");
      const speechFilePromise = this.speechSystem.speak(si.getText(), si.getBaseFileName());
      const speechFilename = await speechFilePromise;
      this.workflowEvents.workflow("tts_response");
      const tts = await this.db.createTts(ssCreator.id, si.getLlmMessageId(), audioFile.id);
      return {
        filePath: () => speechFilename,
        tts: () => tts
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }
}

export {TtsLoqModule};