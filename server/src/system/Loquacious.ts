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
import type {ChatInput, ChatResult} from "../llm/Llm";
import {LlmLoqModule} from "../llm/LlmLoqModule";
import type {CreatorType} from "../domain/CreatorType";
import {StreamServer} from "../StreamServer";
import {SpeechInput, SpeechResult, SpeechSystemLoqModule} from "../speech/SpeechSystem";
import {LipSyncInput, LipSyncLoqModule, LipSyncResult} from "../lipsync/LipSyncAnimator";
import {WorkflowEvents} from "./WorkflowEvents";


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
  private readonly _db: Db;
  private readonly _workflowEvents: WorkflowEvents;

  constructor(PATH_BASE_DATA: string, db: Db, streamServer: WorkflowEvents) {
    this._llms = new LlmService();
    this._speechSystems = new SpeechSystems(PATH_BASE_DATA);
    this._animators = new AnimatorServices(PATH_BASE_DATA);
    this._modes = new Modes();
    this._workflowEvents = streamServer;
    this._db = db;
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
      return this._db.findCreator(creator.getName(), creator.getMetadata(), true);
    }));
  }

  getLlmLoqModule(): LoqModule<ChatInput, ChatResult> {
    // TODO rename to getLlm
    return new LlmLoqModule(this._llms.current(), this._db, this._workflowEvents);
  }

  getTtsLoqModule(): LoqModule<SpeechInput, SpeechResult> {
    // TODO rename to getTts
    return new SpeechSystemLoqModule(this._speechSystems.current(), this._db, this._workflowEvents);
  }

  getLipSyncLoqModule(): LoqModule<LipSyncInput, LipSyncResult> {
    // TODO rename to getLipSync
    return new LipSyncLoqModule(this._animators.current(), this._db, this._workflowEvents);
  }

  setCurrentLlm(key:  string): void {
    this._llms.setCurrent(key);
  }

  setCurrentTts(key:  string): void {
    // TODO standardise on async or not for these setCurrentFoo methods
    this._speechSystems.setCurrent(key);
  }

  setCurrentAnimator(key:  string): void {
    this._animators.setCurrent(key);
  }

  setCurrentMode(key:  string): void {

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

  /** @deprecated transitional interface? */
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
        run: new RunInfo(this._db.getRun())
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
}

export {Loquacious};