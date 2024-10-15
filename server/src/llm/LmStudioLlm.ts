import OpenAI from "openai";
import type {ChatResult, Llm} from "./Llm";

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

  async models(): Promise<Array<string>> {
    const response = await fetch(`${this.baseUrl}/models`);
    const j = await response.json();
    return j.data.filter((o: any) => o.object === "model").map((o: any) => o.id);
  }

  async chat(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): Promise<ChatResult> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages
    });
    return {message: response.choices[0]?.message?.content as (string | null)} as ChatResult;
  }


}

export {LmStudioLlm};