import OpenAI from "openai";
import {hasEnv} from "../system/config";
import type {ChatResult, Llm} from "./Llm";
import ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;
import Model = OpenAI.Model;

/**
 * OpenAI LLM Backend
 */
class OpenAiLlm implements Llm {
  readonly baseUrl = undefined;
  readonly enableHealth = false;
  readonly name = "ChatGPT-LLM";
  canRun = hasEnv("OPENAI_API_KEY");
  private openai;
  private model: string;

  constructor(model = "gpt-4o") {
    this.model = model;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY as string,
    });
  }

  async currentModel(): Promise<string> {
    return this.model;
  }

  async models(): Promise<Array<Model>> {
    let modelsPage = await this.openai.models.list();
    return modelsPage.data as Array<Model>;
  }

  async chat(messages: Array<ChatCompletionMessageParam>): Promise<ChatResult> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: messages
    });
    // hacky opportunistic method to passively correct any failed model configuration request in config
    //this.model = response.model;
    return {message: response.choices[0]?.message?.content as (string | null)} as ChatResult;
  }

  getMetadata(): string | undefined {
    return this.model;
  }

  getName(): string {
    return this.name;
  }

  configure(metadata: string): Promise<void> {
    // note configured model is not necessarily effective model because borked
    this.model = metadata;
    return Promise.resolve();
  }

  free(): boolean {
    return false;
  }
}

export {OpenAiLlm};