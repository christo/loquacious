import LlmGateway from "../llm/LlmGateway";
import {SpeechSystemOption, TtsGateway} from "../speech/TtsGateway";
import AnimatorGateway from "../lipsync/AnimatorGateway";
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
import {LipSyncInput, LipSyncResult} from "../lipsync/Animator";
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
import {PortraitSystem} from "../image/PortraitSystem";
import {ImageInfo} from "../image/ImageInfo";
import {NamedInvoker} from "./fp";


/**
 * Container abstraction for coherent multi-service agent for a single interactive session. Maintains configuration
 * state of component modules as well as interaction mode. For concurrent sessions, each should have an instance of
 * this sharing the same database connection.
 *
 */
class Loquacious {
  private readonly _llms: LlmGateway;
  private readonly _speechSystems: TtsGateway;
  private readonly _animators: AnimatorGateway;
  private readonly _modes: Modes;
  private readonly db: Db;
  private readonly workflowEvents: WorkflowEvents;
  private readonly portraitSystem: PortraitSystem;

  constructor(PATH_BASE_DATA: string, db: Db, workflowEvents: WorkflowEvents, portraitSystem: PortraitSystem) {
    this._llms = new LlmGateway();
    this._speechSystems = new TtsGateway(PATH_BASE_DATA);
    this._animators = new AnimatorGateway(PATH_BASE_DATA);
    this._modes = new Modes();
    this.db = db;
    this.workflowEvents = workflowEvents;
    this.portraitSystem = portraitSystem;
  }

  /** @deprecated transitional interface */
  get llms(): LlmGateway {
    return this._llms;
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

  /**
   * Prepare for making an LLM request, constructs the primary input type.
   * @param userPrompt the text from the user.
   */
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

  /**
   * Concludes any current session, creates a new session and returns it.
   */
  async newSession(): Promise<Session> {
    await this.db.finishCurrentSession();
    return this.getSession();
  }

  async getSystemSummary(): Promise<SystemSummary> {
    return {
      asAt: new Date(),
      mode: {
        current: this.modes.current(),
        all: this.modes.allModes()
      },
      llm: await this.getLlmModule(),
      tts: await this.getTtsModule(),
      lipsync: this.getLipsyncModule(),
      pose: this.getPose(),
      vision: this.getVision(),
      stt: this.getStt(),
      runtime: {
        run: new RunInfo(this.db.getRun())
      },
      health: await systemHealth(this._llms.current())
    };
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

  private getStt() {
    // yet to properly implement
    return {
      current: "whisper.cpp",
      all: ["whisper.cpp", "OpenAI Whisper", "fal.ai something"],
      isFree: true
    };
  }

  private getVision() {
    // yet to properly implement
    return {
      current: "Claude 3.5 Sonnet (New)",
      all: ["Claude 3.5 Sonnet (New)", "ChatGPT", "LM-Studio", "llama.cpp", "fal.ai Florence 2 Large"],
      isFree: false,
    };
  }

  private getPose() {
    // yet to properly implement
    return {
      current: "MediaPipe",
      all: ["MediaPipe", "MoveNet"],
      isFree: true
    };
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
    return this.internalFetchLlm().catch((reason) => {
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

  /**
   * Multi-stage orchestrated chat based on current configuration for the given user prompt and portrait, using the
   * given invoker to call each part.
   *
   * @param prompt for which we orchestrate a response.
   * @param portrait image of the AI respondent.
   * @param invoker used to wrap significant component calls with labels.
   * @return the aggregate response
   */
  async chat(prompt: string, portrait: ImageInfo, invoker: NamedInvoker): Promise<ChatResponse> {
    const llmResultPromise = invoker("loquacious chat", async () => {
      const llmInput = this.createLlmInput(prompt);
      const loqModule = await this.getLlmLoqModule();
      return loqModule.call(llmInput);
    });

    const speechResultPromise = invoker("speech generation",
        async () => this.getTtsLoqModule().call(this.createTtsInput(llmResultPromise))
    );

    const lipSyncResult = invoker("lipsync generation", async () => {
      const animateLoqModule = this.getLipSyncLoqModule();
      const portraitPath = this.portraitSystem.getPath(portrait);
      const lipSyncInput = this.createLipSyncInput(speechResultPromise, portraitPath);
      return animateLoqModule.call(lipSyncInput);
    });

    const lr = await llmResultPromise;
    const messages = (await this.db.getMessages(await this.getSession())).map(m => {
      return lr.targetTts.removePauseCommands(m);
    });
    const sr: SpeechResult = await speechResultPromise;
    return {
      portrait: portrait,
      messages: messages,
      speech: sr.filePath(),
      lipsync: await lipSyncResult,
      llm: lr.llm,
      model: lr.model,
    };
  }
}

interface ChatResponse {
  portrait: ImageInfo,
  messages: Message[],
  speech: string,
  lipsync: LipSyncResult,
  llm: string,
  model: LlmModel,
}

export {Loquacious, type ChatResponse};