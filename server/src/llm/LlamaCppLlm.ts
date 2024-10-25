import type {ChatResult, Llm} from "llm/Llm";
import OpenAI from "openai";
import Model = OpenAI.Model;

/**
 * Connects to an already running llama.cpp process with an OpenAI API implementation.
 */
class LlamaCppLlm implements Llm {
  readonly baseUrl: string | undefined;
  readonly enableHealth = true;
  readonly name = "Llama.cpp-LLM";
  private openai;

  /**
   * By default connects to localhost on default llama.cpp port.
   * @param baseUrl baseUrl of OpenAI API for llama.cpp
   */
  constructor(baseUrl = "http://localhost:8080") {
    this.baseUrl = baseUrl;
    this.openai = new OpenAI({
      baseURL: baseUrl,
      apiKey: process.env.OPENAI_API_KEY as string,
    });
  }

  async currentModel(): Promise<string> {
    return "whatevs";
  }

  async models(): Promise<Array<Model>> {
    const response = await fetch(`${this.baseUrl}/models`);
    const j = await response.json();
    return j.data;
  }

  async chat(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): Promise<ChatResult> {
    const response = await this.openai.chat.completions.create({
      model: "no-idea-is_model-ignored",
      messages: messages
    });
    return {message: response.choices[0]?.message?.content as (string | null)} as ChatResult;
  }

  getMetadata(): string | undefined {
    // seemingly current model is not provided by the API but needs further investigation
    // maybe we could be in charge of launching and configuring the process from here?
    return undefined;
  }

  getName(): string {
    return this.name;
  }

  configure(metadata: string): Promise<void> {
    // currently does not support configuration
    return Promise.reject("does not support configuration because external process defines model");
  }

  free(): boolean {
    return true;
  }
}

export {LlamaCppLlm};