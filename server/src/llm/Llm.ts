import OpenAI from "openai";
import type {CreatorService} from "../system/CreatorService";
import {LoqModule} from "../system/LoqModule";
import {LlmModel} from "./LlmModel";

type OpenAIMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/**
 * Encapsulates a result from calling chat on an Llm.
 */
interface ChatResult {
  message: string | null;
  llm: string;
  model: LlmModel;
}

interface ChatInput {
  params: OpenAIMsg[]
}

/**
 * Large Language Model service.
 * Can do chat completions. May have multiple models that can be dynamically selected.
 */
interface Llm extends CreatorService {
  baseUrl: string | undefined,
  enableHealth: boolean,
  models: () => Promise<Array<LlmModel>>
  chat: (params: OpenAIMsg[]) => Promise<ChatResult>;
  currentModel: () => Promise<LlmModel>;
  setCurrentOption(value: string): Promise<void>;
  loqModule(): LoqModule<ChatInput, ChatResult>
}

export type {Llm, ChatResult, ChatInput};
