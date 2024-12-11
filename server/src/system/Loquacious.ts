/*
TODO extract core logic from server.ts for this

Promise<Audio> -> sttService -> sttResult
message -> llmService -> llmResult
llmResult -> ttsService -> speechResult
(speechResult, portrait) -> animatorService -> animatorResult
 */

import LlmService from "../llm/LlmService";
import {SpeechSystemOption, SpeechSystems} from "../speech/SpeechSystems";
import AnimatorServices from "../lipsync/AnimatorServices";
import {Modes} from "../llm/Modes";
import Db from "../db/Db";
import {SystemSummary} from "../domain/SystemSummary";
import {RunInfo} from "../domain/RunInfo";
import {systemHealth} from "./SystemStatus";
import {LlmModel} from "../llm/LlmModel";
import {Module, ModuleWithOptions} from "../domain/Module";
import {LoqModule} from "./LoqModule";
import type {LlmResult} from "../llm/Llm";
import {LlmLoqModule} from "../llm/LlmLoqModule";
import type {CreatorType} from "../domain/CreatorType";
import {SpeechInput, CrazySpeechResult} from "../speech/SpeechSystem";
import {LipSyncInput, LipSyncResult} from "../lipsync/LipSyncAnimator";
import {WorkflowEvents} from "./WorkflowEvents";
import {LlmInput} from "../llm/LlmInput";
import {Session} from "../domain/Session";
import {Message} from "../domain/Message";
import {TtsLoqModule} from "../speech/TtsLoqModule";
import type {AudioFile} from "../domain/AudioFile";
import {LipSyncLoqModule} from "../lipsync/LipSyncLoqModule";
import {VideoFile} from "../domain/VideoFile";


/**
 * Container abstraction for coherent multi-service agent for a single interactive session. Maintains configuration
 * state of component modules as well as interaction mode. For concurrent sessions, each should have an instance of
 * this sharing the same database connection.
 *
 */
class Loquacious {
  private readonly _llms: LlmService;
  private readonly _speechSystems: SpeechSystems;
  private readonly _animators: AnimatorServices;
  private readonly _modes: Modes;
  private readonly db: Db;
  private readonly workflowEvents: WorkflowEvents;

  constructor(PATH_BASE_DATA: string, db: Db, streamServer: WorkflowEvents) {
    this._llms = new LlmService();
    this._speechSystems = new SpeechSystems(PATH_BASE_DATA);
    this._animators = new AnimatorServices(PATH_BASE_DATA);
    this._modes = new Modes();
    this.workflowEvents = streamServer;
    this.db = db;
  }

  // TODO need to support setting configuration options for some CreatorTypes

  /**
   * Makes sure all the current available CreatorTypes have database entities
   */
  async initialiseCreatorTypes(): Promise<void> {
    const creators: CreatorType[] = [
      ...this._llms.all(),
      ...this._speechSystems.systems,
      ...this._animators.all()
    ];
    console.log(`ensuring ${creators.length} creator types are in database`);
    await Promise.all(creators.map(async creator => {
      console.log(`   initialising ${creator.getName()}`);
      return this.db.findCreator(creator.getName(), creator.getMetadata(), true);
    }));
  }

  async createLlmInput(userPrompt: string): Promise<LlmInput> {
    const session = await this.getSession();
    console.log("storing user message");
    // must await this so that it's in the message history at next db call
    await this.db.createUserMessage(session, userPrompt);
    const messageHistory: Message[] = await this.db.getMessages(session);
    const llmInputCreator = this.modes.getLlmInputCreator();
    return llmInputCreator(messageHistory, this._speechSystems.current());
  }

  async createTtsInput(llmResult: Promise<LlmResult>): Promise<SpeechInput> {
    const ssCreator = await this.db.findCreatorForService(this._speechSystems.current());
    const mimeType = this._speechSystems.current().speechOutputFormat().mimeType;
    const audioFile: AudioFile = await this.db.createAudioFile(mimeType, ssCreator.id);
    const baseAudioFileName = `${audioFile.id}`;
    return llmResult.then(llmResult => {
      return {
        getText: () => llmResult.llmMessage!.content,
        getBaseFileName: () => baseAudioFileName,
        getLlmMessageId: () => llmResult.llmMessage!.id
      } as SpeechInput
    });
  }

  async getLlmLoqModule(): Promise<LoqModule<LlmInput, LlmResult>> {
    return new LlmLoqModule(this._llms.current(), this.db, this.workflowEvents, await this.getSession());
  }

  getTtsLoqModule(): LoqModule<SpeechInput, CrazySpeechResult> {
    return new TtsLoqModule(this._speechSystems.current(), this.db, this.workflowEvents);
  }

  getLipSyncLoqModule(): LoqModule<LipSyncInput, LipSyncResult> {
    return new LipSyncLoqModule(this._animators.current(), this.db, this.workflowEvents);
  }

  setCurrentLlm(key: string): void {
    this._llms.setCurrent(key);
  }

  setCurrentTts(key: string): Promise<void> {
    // TODO standardise on async or not for these setCurrentFoo methods
    return this._speechSystems.setCurrent(key);
  }

  setCurrentAnimator(key: string): void {
    this._animators.setCurrent(key);
  }

  /**
   * Gets current {@link Session} or creates it if none exists.
   */
  async getSession(): Promise<Session> {
    return this.db.getOrCreateSession();
  }

  async newSession(): Promise<Session> {
    await this.db.finishCurrentSession();
    return await this.db.createSession();
  }

  /** @deprecated transitional interface */
  get llms(): LlmService {
    return this._llms;
  }

  /** @deprecated transitional interface */
  get speechSystems(): SpeechSystems {
    return this._speechSystems;
  }

  /** @deprecated transitional interface */
  get animators(): AnimatorServices {
    return this._animators;
  }

  // TODO decide how this should handle mode changes
  get modes(): Modes {
    return this._modes;
  }

  private async getLlmModule(): Promise<ModuleWithOptions<LlmModel>> {
    return {
      current: this._llms.current().getName(),
      all: this._llms.all().map(llm => llm.getName()),
      options: await this._llms.current().models(),
      currentOption: await this._llms.current().currentModel(),
      isFree: this._llms.current().free()
    }
  }

  async getSystem(): Promise<SystemSummary> {
    const system: SystemSummary = {
      asAt: new Date(),
      mode: {
        current: this.modes.current(),
        all: this.modes.allModes()
      },
      llm: await this.getLlmModule(),
      tts: await this.getTtsModule(),
      lipsync: this.getLipsyncModule(),
      pose: {
        current: "MediaPipe",
        all: ["MediaPipe", "MoveNet"],
        isFree: true
      },
      vision: {
        current: "Claude 3.5 Sonnet (New)",
        all: ["Claude 3.5 Sonnet (New)", "ChatGPT", "LM-Studio", "llama.cpp", "fal.ai Florence 2 Large"],
        isFree: false,
      },
      stt: {
        current: "whisper.cpp",
        all: ["whisper.cpp", "OpenAI Whisper", "fal.ai something"],
        isFree: true
      },
      runtime: {
        run: new RunInfo(this.db.getRun())
      },
      health: await systemHealth(this.llms.current())
    };
    return system;
  }

  private getLipsyncModule(): Module {
    return {
      all: this.animators.all().map(ls => ls.getName()),
      current: this.animators.current().getName(),
      isFree: this.animators.current().free()
    } as Module;
  }

  private async getTtsModule(): Promise<ModuleWithOptions<SpeechSystemOption>> {
    return {
      current: this._speechSystems.current().getName(),
      all: this._speechSystems.systems.map(ss => ss.getName()),
      currentOption: this._speechSystems.current().currentOption(),
      options: this._speechSystems.current().options(),
      isFree: this._speechSystems.current().free(),
    }
  }

  async createLipSyncInput(speechResultPromise: Promise<CrazySpeechResult>, imageFile: string): Promise<LipSyncInput> {
    const animator = this._animators.current();
    const lipsyncCreator = await this.db.findCreator(animator.getName(), animator.getMetadata(), true);
    const mimeType = animator.videoOutputFormat()?.mimeType;
    if (!mimeType) {
      // TODO relocate mimeType thingy
      return Promise.reject(new Error("No mime type found."));
    } else {
      const videoFile: VideoFile = await this.db.createVideoFile(mimeType, lipsyncCreator.id);
      const sr = await speechResultPromise;
      const speechFilePath = (await sr.filePath())!;
      const ttsId = (await sr.tts())!;
      const lsiPromise = speechResultPromise.then(sr => {
        return {
          fileKey: `${videoFile.id}`,
          imageFile: imageFile,
          speechFile: speechFilePath,
          creatorId: lipsyncCreator.id,
          videoId: videoFile.id,
          ttsId: ttsId!.id
        } as LipSyncInput;
      });

      return lsiPromise;
    }
  }
}

export {Loquacious};