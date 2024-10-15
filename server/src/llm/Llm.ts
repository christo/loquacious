import OpenAI from "openai";
import Model = OpenAI.Model;

type ChatResult = {
  message: string | null;
}


type Llm = {
  name: string,
  baseUrl: string | undefined,
  enableHealth: boolean,
  models: () => Promise<Array<Model>>
  chat: (params: OpenAI.Chat.Completions.ChatCompletionMessageParam[]) => Promise<ChatResult>;
  currentModel: () => Promise<string>;
}

export type {Llm, ChatResult};
