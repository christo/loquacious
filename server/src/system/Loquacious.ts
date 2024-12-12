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
import {LipSyncInput, LipSyncResult} from "../lipsync/LipSyncAnimator";
import {WorkflowEvents} from "./WorkflowEvents";
import {LlmInput} from "../llm/LlmInput";
import {Session} from "../domain/Session";
import {Message} from "../domain/Message";
import {TtsLoqModule} from "../speech/TtsLoqModule";
import type {AudioFile} from "../domain/AudioFile";
import {LipSyncLoqModule} from "../lipsync/LipSyncLoqModule";
import {VideoFile} from "../domain/VideoFile";
import {timed} from "./performance";
import {SpeechResult} from "../speech/SpeechResult";
import {SpeechInput} from "../speech/SpeechInput";


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

  /** @deprecated transitional interface */
  get llms(): LlmService {
    return this._llms;
  }

  /** @deprecated transitional interface */
  get animators(): AnimatorServices {
    return this._animators;
  }

  get modes(): Modes {
    return this._modes;
  }

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

  /**
   * LLM
   */
  async getLlmLoqModule(): Promise<LoqModule<LlmInput, LlmResult>> {
    return new LlmLoqModule(this._llms.current(), this.db, this.workflowEvents, await this.getSession());
  }

  /**
   * TTS
   */
  getTtsLoqModule(): LoqModule<SpeechInput, SpeechResult> {
    return new TtsLoqModule(this._speechSystems.current(), this.db, this.workflowEvents);
  }

  /**
   * LipSync
   */
  getLipSyncLoqModule(): LoqModule<LipSyncInput, LipSyncResult> {
    return new LipSyncLoqModule(this._animators.current(), this.db, this.workflowEvents);
  }

  setCurrentLlm(key: string): void {
    this._llms.setCurrent(key);
  }

  /**
   * Sets the model for the LLM.
   * @param key unique name of the model
   */
  async setLlmOption(key: string): Promise<void> {
    await this._llms.current().setCurrentOption(key);
  }

  setCurrentTts(key: string): Promise<void> {
    // TODO standardise on async or not for these setCurrentFoo methods
    return this._speechSystems.setCurrent(key);
  }

  /**
   * Sets the option for TTS (the voice).
   * @param key unique name of the option
   */
  async setTtsOption(key: string): Promise<void> {
    await this._speechSystems.current().setCurrentOption(key);
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

  async createLipSyncInput(speechResultPromise: Promise<SpeechResult>, imageFile: string): Promise<LipSyncInput> {
    const animator = this._animators.current();
    const lipsyncCreator = await this.db.findCreator(animator.getName(), animator.getMetadata(), true);
    const mimeType = animator.videoOutputFormat()?.mimeType;
    if (!mimeType) {
      // TODO relocate mimeType thingy
      return Promise.reject(new Error("No mime type found."));
    } else {
      const videoFile: VideoFile = await this.db.createVideoFile(mimeType, lipsyncCreator.id);
      return speechResultPromise.then(sr => ({
            fileKey: `${videoFile.id}`,
            imageFile: imageFile,
            speechFile: sr.filePath(),
            creatorId: lipsyncCreator.id,
            videoId: videoFile.id,
            ttsId: sr.tts().id
          } as LipSyncInput)
      );
    }
  }

  private async internalFetchLlm(): Promise<ModuleWithOptions<LlmModel>> {
    return timed("llm module acquisition", async () => ({
      current: this._llms.current().getName(),
      all: this._llms.all().map(llm => llm.getName()),
      options: await this._llms.current().models(),
      currentOption: await this._llms.current().currentModel(),
      isFree: this._llms.current().free()
    } as ModuleWithOptions<LlmModel>));
  }

  private async getLlmModule(): Promise<ModuleWithOptions<LlmModel>> {

    // TODO need a general mechanism like this for any service that can fail intermittently
    //   and the failure needs to be handled here transparently on any promise, updating current to a fallback and
    //   feeding some kind of broken message to UI. Negotiation of a fallback requires dynamic logic. TTS fallback
    //   can be MacOS speech, but only on MacOS.
    const llmp = this.internalFetchLlm().catch((reason) => {
      // TODO move this fallback code to this.getLlmModule and friends?
      const failingLlm = this._llms.current().getName();
      const fallbackLlm = this._llms.FALLBACK.getName();
      // TODO report error reason to front-end through streamserver/websocket
      // TODO robust resaon handling: openai failure due to cloudflare timeout results in html page as reason
      console.warn(`Unexpected LLM failure for ${failingLlm}, reverting to fallback LLM ${fallbackLlm}`);
      // openai failure seemed to report a reason which is an http response body with 500 and html page
      // so maybe a RequiresOnlineService interface should specify a failure interpretation method for implementers
      // and RequriesExternalProcess (like LmStudioLlm) could have similar and InProcess (like FakeLlm) wouldn't need it
      console.error("reason dump:");
      console.dir(reason);
      this.setCurrentLlm(fallbackLlm);
      return this.internalFetchLlm();
    });


    return llmp;
  }

  private getLipsyncModule(): Module {
    return {
      all: this._animators.all().map(ls => ls.getName()),
      current: this._animators.current().getName(),
      isFree: this._animators.current().free()
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