import OpenAI from "openai";
import type {CreatorService} from "../system/CreatorService";
import Model = OpenAI.Model;

/**
 * Encapsulates a result from calling chat on an Llm.
 */
type ChatResult = {
  message: string | null;
}

/**
 * Large Language Model service.
 * Can do chat completions. May have multiple models that can be dynamically selected.
 */
interface Llm extends CreatorService {
  baseUrl: string | undefined,
  enableHealth: boolean,
  models: () => Promise<Array<Model>>
  chat: (params: OpenAI.Chat.Completions.ChatCompletionMessageParam[]) => Promise<ChatResult>;
  currentModel: () => Promise<string>;

  setCurrentOption(value: string): Promise<void>;
}

export type {Llm, ChatResult};
