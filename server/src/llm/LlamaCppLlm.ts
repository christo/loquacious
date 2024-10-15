import {response} from "express";
import type {Llm, ChatResult} from "llm/Llm";
import OpenAI from "openai";

class LlamaCppLlm implements Llm {
  baseUrl: string | undefined;
  enableHealth = true;
  name = "Llama.cpp";
  private openai;

  constructor(baseUrl = "http://localhost:8080") {
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

export {LlamaCppLlm};