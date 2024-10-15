import type {BackEnd, ChatResult} from "llm/BackEnd";
import OpenAI from "openai";
import ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;

/**
 * OpenAI LLM Backend
 */
class OpenAiBackEnd implements BackEnd {
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

  async models(): Promise<Array<string>> {
    let modelsPage = await this.openai.models.list();
    return modelsPage.data.map(m => m.id);
  }

  async chat(messages: Array<ChatCompletionMessageParam>): Promise<ChatResult> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: messages
    });
    return {message: response.choices[0]?.message?.content as (string | null)} as ChatResult;
  }

}

export {OpenAiBackEnd};