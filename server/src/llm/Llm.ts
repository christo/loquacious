import OpenAI from "openai";
import type {CreatorService} from "../system/CreatorService";

type OpenAIMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

type Model = OpenAI.Model;

/**
 * Encapsulates a result from calling chat on an Llm.
 */
interface ChatResult {
  message: string | null;
  llm: string;
  model: Model;
}

/**
 * Large Language Model service.
 * Can do chat completions. May have multiple models that can be dynamically selected.
 */
interface Llm extends CreatorService {
  baseUrl: string | undefined,
  enableHealth: boolean,
  models: () => Promise<Array<Model>>
  chat: (params: OpenAIMsg[]) => Promise<ChatResult>;
  currentModel: () => Promise<Model>;

  setCurrentOption(value: string): Promise<void>;
}

export type {Llm, ChatResult};
