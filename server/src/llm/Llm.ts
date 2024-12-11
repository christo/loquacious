import type {CreatorService} from "../system/CreatorService";
import {LlmModel} from "./LlmModel";
import {OpenAIMsg} from "./OpenAIMsg";
import {Message} from "../domain/Message";

/**
 * Encapsulates a result from calling chat on an Llm.
 */
interface LlmResult {
  message: string | null;
  llm: string;
  model: LlmModel;

  /**
   * A database-wired domain instance if creation was successful.
   */
  llmMessage: Message | null;
}

/**
 * Large Language Model service.
 * Can do chat completions. May have multiple models that can be dynamically selected.
 */
interface Llm extends CreatorService {
  baseUrl: string | undefined,
  enableHealth: boolean,
  models: () => Promise<Array<LlmModel>>
  chat: (params: OpenAIMsg[]) => Promise<LlmResult>;
  currentModel: () => Promise<LlmModel>;

  setCurrentOption(value: string): Promise<void>;
}

export type {Llm, LlmResult};
