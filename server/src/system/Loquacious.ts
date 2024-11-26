/*
Idea is like a DI container, modules are added which feed into each other and emit events, possibly failures.

DiD can do speech as well... can we make the hand-off between
the implementations of each module transparently handle the
effective no-op of the middle pass-through call?


TODO: create generic module interface with input type and output type

Promise<Audio> -> sttService -> sttResult
message -> llmService -> llmResult
llmResult -> ttsService -> speechResult
(speechResult, portrait) -> animatorService -> animatorResult



TODO extract core logic from server.ts for this
 */

import LlmService from "../llm/LlmService";
import {SpeechSystems} from "../speech/SpeechSystems";
import AnimatorServices from "../lipsync/AnimatorServices";
import {Modes} from "../llm/Modes";
import Db from "../db/Db";
import {SystemSummary} from "../domain/SystemSummary";
import {RunInfo} from "../domain/RunInfo";
import {systemHealth} from "./SystemStatus";


// temporary until we figure out the shape of events
type LoqEvent = {
  channel: string;
};

/**
 * Generic async function call.
 */
interface LoqModule<I, O> {
  /**
   * Perform primary function, transforming input to output.
   * @param input
   */
  call(input: Promise<I>): Promise<O>;

  /**
   * Register for events
   * @param event
   * @param handler
   */
  on(event: string, handler: (event: LoqEvent) => void): void;
}

/**
 * Container abstraction for coherent multi-service agent for a single interactive session. Maintains configuration
 * state of component modules as well as interaction mode. For concurrent sessions, each should have an instance of
 * this sharing the same database connection.
 */
class Loquacious {
  private readonly _llms: LlmService;
  private readonly _speechSystems: SpeechSystems;
  private readonly _animators: AnimatorServices;
  private readonly _modes: Modes;
  private db: Db;

  constructor(PATH_BASE_DATA: string, db: Db) {
    this._llms = new LlmService();
    this._speechSystems = new SpeechSystems(PATH_BASE_DATA);
    this._animators = new AnimatorServices(PATH_BASE_DATA);
    this._modes = new Modes();
    this.db = db;
  }


  get llms(): LlmService {
    return this._llms;
  }

  get speechSystems(): SpeechSystems {
    return this._speechSystems;
  }

  get animators(): AnimatorServices {
    return this._animators;
  }

  get modes(): Modes {
    return this._modes;
  }

  async getSystem(): Promise<SystemSummary> {
    const system: SystemSummary = {
      asAt: new Date(),
      mode: {
        current: this.modes.current(),
        all: this.modes.allModes()
      },
      llm: {
        current: this.llms.current().getName(),
        all: this.llms.all().map(llm => llm.getName()),
        options: await this.llms.current().models(),
        currentOption: await this.llms.current().currentModel(),
        isFree: this.llms.current().free()
      },
      tts: {
        current: this.speechSystems.current().getName(),
        all: this.speechSystems.systems.map(ss => ss.getName()),
        currentOption: this.speechSystems.current().currentOption(),
        options: this.speechSystems.current().options(),
        isFree: this.speechSystems.current().free(),
      },
      lipsync: {
        all: this.animators.all().map(ls => ls.getName()),
        current: this.animators.current().getName(),
        isFree: this.animators.current().free()
      },
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

}

export {Loquacious, type LoqModule, type LoqEvent};