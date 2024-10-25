import OpenAI from "openai";
import type {ChatResult, Llm} from "./Llm";
import Model = OpenAI.Model;

class LmStudioLlm implements Llm {
  readonly baseUrl: string | undefined;
  readonly enableHealth = false;
  readonly name = "LM-Studio-LLM";
  private openai;

  constructor(baseUrl = "http://localhost:1234/v1") {
    this.baseUrl = baseUrl;
    // TODO can we specify the model here?
    this.openai = new OpenAI({
      baseURL: baseUrl,
      apiKey: process.env.OPENAI_API_KEY as string,
    });
  }

  async currentModel(): Promise<string> {
    const allModels = await this.models();
    if (allModels.length === 1) {
      return allModels[0].id;
    } else {
      return "unknown";
    }
  }

  async models(): Promise<Array<Model>> {
    const response = await fetch(`${this.baseUrl}/models`);
    const j = await response.json();
    return j.data;
  }

  async chat(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): Promise<ChatResult> {
    const model = (await this.models())[0].id;
    const response = await this.openai.chat.completions.create({
      model: model,
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

export {LmStudioLlm};