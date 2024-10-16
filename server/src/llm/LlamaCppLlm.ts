import type {ChatResult, Llm} from "llm/Llm";
import OpenAI from "openai";
import Model = OpenAI.Model;

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

  async currentModel(): Promise<string> {
    return "whatevs";
  }

  async models(): Promise<Array<Model>> {
    const response = await fetch(`${this.baseUrl}/models`);
    const j = await response.json();
    return j.data;
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