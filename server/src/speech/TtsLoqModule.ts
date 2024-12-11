import {LoqModule} from "../system/LoqModule";
import Db from "../db/Db";
import {WorkflowEvents} from "../system/WorkflowEvents";
import {AsyncSpeechResult, SpeechInput, CrazySpeechResult, SpeechSystem} from "./SpeechSystem";
import type {AudioFile} from "../domain/AudioFile";

class TtsLoqModule implements LoqModule<SpeechInput, CrazySpeechResult> {
  private readonly speechSystem: SpeechSystem;
  private db: Db;
  private workflowEvents: WorkflowEvents;

  constructor(ss: SpeechSystem, db: Db, workflowEvents: WorkflowEvents) {
    this.speechSystem = ss;
    this.db = db;
    this.workflowEvents = workflowEvents;
  }

  async call(input: Promise<SpeechInput>): Promise<CrazySpeechResult> {
    try {
      const ssCreator = await this.db.findCreatorForService(this.speechSystem);
      const mimeType = this.speechSystem.speechOutputFormat().mimeType;
      const audioFile: AudioFile = await this.db.createAudioFile(mimeType, ssCreator.id);
      this.workflowEvents.workflow("tts_request");
      const si = await input;
      const speechResultPromise = this.speechSystem.speak(si.getText(), si.getBaseFileName());
      const sr = await speechResultPromise;
      this.workflowEvents.workflow("tts_response");
      const tts = await this.db.createTts(ssCreator.id, si.getLlmMessageId(), audioFile.id);
      // TODO this is fucked:
      return AsyncSpeechResult.fromValues(await sr.filePath(), tts);
    } catch (e) {
      return Promise.reject(e);
    }
  }
}

export {TtsLoqModule};