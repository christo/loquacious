import type {CreatorService} from "../system/CreatorService";
import {LlmModel} from "./LlmModel";
import {OpenAIMsg} from "./OpenAIMsg";

/**
 * Encapsulates a result from calling chat on an Llm.
 */
interface LlmResult {
  message: string | null;
  llm: string;
  model: LlmModel;
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
