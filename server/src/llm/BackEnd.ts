import OpenAI from "openai";

type ChatResult = {
  message: string | null;
}

type BackEnd = {
  name: string,
  baseUrl: string | undefined,
  enableHealth: boolean,
  models: () => Promise<Array<string>>
  chat: (params: OpenAI.Chat.Completions.ChatCompletionMessageParam[]) => Promise<ChatResult>;
}

export type {BackEnd, ChatResult};
