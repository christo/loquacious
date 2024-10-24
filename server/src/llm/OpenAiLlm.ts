import {response} from "express";
import OpenAI from "openai";
import type {ChatResult, Llm} from "./Llm";
import ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;
import Model = OpenAI.Model;

/**
 * OpenAI LLM Backend
 */
class OpenAiLlm implements Llm {
  readonly baseUrl = undefined;
  readonly enableHealth = false;
  readonly name = "ChatGPT";
  private openai;
  private model: string;

  constructor(model = "gpt-4o-mini") {
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
    this.model = response.model;
    return {message: response.choices[0]?.message?.content as (string | null)} as ChatResult;
  }

  getMetadata(): string | undefined {
    return this.model;
  }

  getName(): string {
    return this.name;
  }

  configure(metadata: string): Promise<void> {
    // TODO see if we can implement configuration by metadata here - do not assume we can use use all models;
    //   some do not support specifying system prompt and some options seem to be ignored
    return Promise.reject("unimplemented - it's complicated");
  }

}

export {OpenAiLlm};