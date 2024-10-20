import OpenAI from "openai";
import type {ChatResult, Llm} from "./Llm";
import Model = OpenAI.Model;

class LmStudioLlm implements Llm {
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


}

export {LmStudioLlm};