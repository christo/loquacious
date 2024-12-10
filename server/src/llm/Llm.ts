import OpenAI from "openai";
import type {CreatorService} from "../system/CreatorService";
import {LlmModel} from "./LlmModel";

type OpenAIMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/**
 * Encapsulates a result from calling chat on an Llm.
 */
interface LlmResult {
  message: string | null;
  llm: string;
  model: LlmModel;
}

/**
 * Input to LLM includes system prompts as well as user prompts, both from the whole conversation so far
 * and also the current new request.
 *
 * In future some event trigger inputs might need to be added and it's also possible that responses from
 * the ai are synthesised to bend it closer to a behavioural goal.
 *
 * Apart from obvious simple implementation {@link BasicLlmInput} the planned "expert system" and
 * potentially a more complex database-stored system prompt builder might be warranted to support
 * ongoing refinement of multiple personalities, moods, guidance on back stories and manage the
 * non-repetition or conflict of generated content across conversations. Also there may need to be
 * more methods here.
 */
interface LlmInput {
  getParams(): OpenAIMsg[];
}

/**
 * Simple implementation.
 */
class BasicLlmInput implements LlmInput {
  private readonly _params: OpenAIMsg[];

  constructor(params: OpenAIMsg[]) {
    this._params = params;
  }

  getParams(): OpenAIMsg[] {
    return this._params;
  }
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

export type {Llm, LlmResult, LlmInput};
export {BasicLlmInput};
