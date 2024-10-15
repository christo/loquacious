import {response} from "express";
import type {BackEnd, ChatResult} from "llm/BackEnd";
import OpenAI from "openai";

class LmStudioBackEnd implements BackEnd {
  baseUrl: string | undefined;
  enableHealth = false;
  name = "LM-Studio";
  private openai;

  constructor(baseUrl = "http://localhost:1234/v1") {
    this.baseUrl = baseUrl;
    this.openai = new OpenAI({
      baseURL: baseUrl,
      apiKey: process.env.OPENAI_API_KEY as string,
    });
  }

  async models(): Promise<Array<string>> {
    return Promise.resolve(["TODO"]);
  }

  async chat(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): Promise<ChatResult> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages
    });
    return {message: response.choices[0]?.message?.content as (string | null)} as ChatResult;
  }


}

export {LmStudioBackEnd};