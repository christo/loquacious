import OpenAI from "openai";
import {always} from "../system/config";
import type {ChatResult, Llm} from "./Llm";
type Model = OpenAI.Model;

type OpenAIMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

class LmStudioLlm implements Llm {
  readonly baseUrl: string | undefined;
  readonly enableHealth = false;
  private readonly name = "LM-Studio-LLM";
  canRun = always;
  private openai;
  private currentModelId: string | null = null;

  // TODO replace this with an async static
  constructor(baseUrl = "http://localhost:1234/v1") {
    this.baseUrl = baseUrl;
    // seems we cannot simply specify the model here, not all results from models() can be used with a system prompt
    // and the effective model indicated on the response is not necessarily what was requested, it may partly be a
    // version alias thing i.e. asking for gpt4o-latest may result in gpt4o-x.y.z
    this.openai = new OpenAI({
      baseURL: baseUrl,
      apiKey: process.env.OPENAI_API_KEY as string,
    });
  }

  /**
   * If there's only one model, it must be current. Otherwise we assume we don't know.
   */
  async currentModel(): Promise<Model> {
    const allModels = await this.models();
    if (allModels.length === 1) {
      return allModels[0];
    } else {
      return Promise.reject(`Undecided which model is "current" here.`);
    }
  }

  /**
   * Currently does nothing.
   * @param value
   */
  async setCurrentOption(value: string): Promise<void> {
    const currentModel = await this.fetchCurrentModel(value);
    if (currentModel) {
      this.currentModelId = value;
    } else {
      return Promise.reject(`Model ${value} not currently loaded for ${this.name}`);
    }
  }

  private async fetchCurrentModel(value: string) {
    const currentModels = await this.models();
    return currentModels.find(m => m.id === value);
  }

  async models(): Promise<Array<Model>> {
    const response = await fetch(`${this.baseUrl}/models`);
    const j = await response.json();
    return j.data;
  }

  async chat(messages: OpenAIMsg[]): Promise<ChatResult> {
    const model = (await this.models())[0].id;
    const response = await this.openai.chat.completions.create({
      model: model,
      messages: messages
    });
    const text = response.choices[0]?.message?.content as (string | null);
    return {
      message: text,
      llm: this.name,
      model: await this.currentModel()
    } as ChatResult;
  }

  getMetadata(): string | undefined {
    // this is error prone
    return this.currentModelId ? this.currentModelId : undefined;
  }

  getName(): string {
    return this.name;
  }

  /**
   * Not supported.
   * @param _metadata
   */
  configure(_metadata: string): Promise<void> {
    // TODO make this work in the case that current model is loaded
    return Promise.reject("does not support configuration because external process defines model");
  }

  free(): boolean {
    return true;
  }
}

export {LmStudioLlm};