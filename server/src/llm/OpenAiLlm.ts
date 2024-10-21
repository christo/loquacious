import OpenAI from "openai";
import type {ChatResult, Llm} from "./Llm";
import ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;
import Model = OpenAI.Model;

/**
 * OpenAI LLM Backend
 */
class OpenAiLlm implements Llm {
  baseUrl = undefined;
  enableHealth = false;
  name = "ChatGPT";
  private openai;
  private readonly model;

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
    return {message: response.choices[0]?.message?.content as (string | null)} as ChatResult;
  }

}

export {OpenAiLlm};