import type {Llm, PartialLlmResult} from "llm/Llm";
import OpenAI from "openai";
import {always} from "../system/config";
import {LlmModel} from "./LlmModel";

type OpenAIMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const LLAMA_CPP_BASE_URL_DEFAULT = "http://localhost:8080";

/**
 * Connects to an already running llama.cpp process with an OpenAI API implementation.
 */
class LlamaCppLlm implements Llm {
  readonly baseUrl: string | undefined;
  readonly enableHealth = true;
  canRun = always; // untrue, needs server to be running
  private readonly name = "Llama.cpp-LLM";
  private openai;

  /**
   * By default connects to localhost on default llama.cpp port.
   * @param baseUrl baseUrl of OpenAI API for llama.cpp
   */
  constructor(baseUrl = LLAMA_CPP_BASE_URL_DEFAULT) {
    this.baseUrl = baseUrl;
    this.openai = new OpenAI({
      baseURL: baseUrl,
      apiKey: "REQURIED_BY_OPENAI_IGNORED_BY_LLAMA_CPP",
    });
  }

  async currentModel(): Promise<LlmModel> {
    // pretty dodgy
    return (await this.models())[0];
  }

  /**
   * No implementation of model choice for this Llm system.
   * @param _value
   */
  setCurrentOption(_value: string): Promise<void> {
    return Promise.reject(`${this.name}: Cannot change models.`);
  }

  async models(): Promise<Array<LlmModel>> {
    const response = await fetch(`${this.baseUrl}/models`);
    const j = await response.json();
    return j.data;
  }

  async chat(messages: OpenAIMsg[]): Promise<PartialLlmResult> {
    const response = await this.openai.chat.completions.create({
      model: "no-idea-is_model-ignored",
      messages: messages
    });
    const text = response.choices[0]?.message?.content as (string | null);
    return {
      message: text,
      llm: this.name,
      model: await this.currentModel(),
    } as PartialLlmResult;
  }

  getMetadata(): string | undefined {
    // seemingly current model is not provided by the API but needs further investigation
    // maybe we could be in charge of launching and configuring the process from here?
    return undefined;
  }

  getName(): string {
    return this.name;
  }

  configure(_metadata: string): Promise<void> {
    // currently does not support configuration
    return Promise.reject("does not support configuration because external process defines model");
  }

  free(): boolean {
    return true;
  }
}

export {LlamaCppLlm};