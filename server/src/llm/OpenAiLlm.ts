import OpenAI from "openai";
import {hasEnv} from "../system/config";
import type {ChatResult, Llm} from "./Llm";
import ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;
import Model = OpenAI.Model;

const CANNOT_DO_SYSTEM_PROMPT = [
  "o1preview"
];

/**
 * OpenAI LLM Backend
 */
class OpenAiLlm implements Llm {
  readonly baseUrl = undefined;
  readonly enableHealth = false;
  private readonly name = "ChatGPT-LLM";
  canRun = hasEnv("OPENAI_API_KEY");
  private openai;
  private modelName: string;

  constructor(model = "gpt-4o") {
    this.modelName = model;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY as string,
    });
  }

  async currentModel(): Promise<Model> {
    const theModel = await this.findByName(this.modelName);
    if (theModel) {
      return theModel;
    } else {
      return Promise.reject(`Model ${this.modelName} not found`);
    }
  }

  private async findByName(modelName: string) {
    const models = await this.models();
    return models.find((model) => model.id === modelName);
  }

  async setCurrentOption(value: string): Promise<void> {
    if (CANNOT_DO_SYSTEM_PROMPT.includes(value)) {
      // special case, unusable theoretical model option
      return Promise.reject(`${value} cannot do a system prompt`);
    }
    const m = await this.findByName(value);
    if (m) {
      this.modelName = m.id;
      return Promise.resolve();
    } else {
      return Promise.reject(`${this.name}: No known model ${value}`);
    }
  }

  async models(): Promise<Array<Model>> {
    let modelsPage = await this.openai.models.list();
    return modelsPage.data.filter(m => !CANNOT_DO_SYSTEM_PROMPT.includes(m.id)) as Array<Model>;
  }

  async chat(messages: Array<ChatCompletionMessageParam>): Promise<ChatResult> {
    const response = await this.openai.chat.completions.create({
      model: this.modelName,
      messages: messages
    });
    return {message: response.choices[0]?.message?.content as (string | null)} as ChatResult;
  }

  getMetadata(): string | undefined {
    return this.modelName;
  }

  getName(): string {
    return this.name;
  }

  configure(metadata: string): Promise<void> {
    // note configured model is not necessarily effective model because borked
    this.modelName = metadata;
    return Promise.resolve();
  }

  free(): boolean {
    return false;
  }
}

export {OpenAiLlm};