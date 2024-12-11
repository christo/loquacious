import type {CreatorService} from "../system/CreatorService";
import {LlmModel} from "./LlmModel";
import {OpenAIMsg} from "./OpenAIMsg";
import {Message} from "../domain/Message";
import {SpeechSystem} from "../speech/SpeechSystem";

/**
 * Encapsulates a result from calling chat on an Llm.
 */
interface LlmResult {
  /**
   * The generated text from the LLM.
   */
  message: string | null;

  /**
   * Which LLM system was used.
   */
  llm: string;

  /**
   * Which model was used.
   */
  model: LlmModel;

  /**
   * A database-wired domain instance if creation was successful.
   */
  llmMessage: Message | null;

  /**
   * The tts system for which this text was generated.
   */
  targetTts: SpeechSystem;
}

/**
 *
 */
class LlmResultStruct implements LlmResult {

  readonly llm: string;
  readonly llmMessage: Message | null;
  readonly message: string | null;
  readonly model: LlmModel;
  readonly targetTts: SpeechSystem;

  constructor(llm: string, llmMessage: Message | null, message: string | null, model: LlmModel, targetTts: SpeechSystem) {
    this.llm = llm;
    this.llmMessage = llmMessage;
    this.message = message;
    this.model = model;
    this.targetTts = targetTts;
  }

}

/**
 * Pre-database and pre-accumulation chat result type.
 */
type PartialLlmResult = {
  message: string | null,
  llm: string,
  model: LlmModel
}

/**
 * Large Language Model service.
 * Can do chat completions. May have multiple models that can be dynamically selected.
 */
interface Llm extends CreatorService {
  baseUrl: string | undefined,
  enableHealth: boolean,
  models: () => Promise<Array<LlmModel>>
  chat: (params: OpenAIMsg[]) => Promise<PartialLlmResult>;
  currentModel: () => Promise<LlmModel>;

  setCurrentOption(value: string): Promise<void>;
}

export type {Llm, LlmResult, PartialLlmResult};
export {LlmResultStruct};
