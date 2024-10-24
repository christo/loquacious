import type {ChatResult, Llm} from "llm/Llm";
import OpenAI from "openai";
import ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;
import Model = OpenAI.Model;

/*
Using acouple of OpenAI's lightweight interfaces as part of our public interface seems fine.
 */


/** Support multiple "models" to conveniently switch between different fake behaviour */
class FakeModel implements Model {
  created: number;
  id: string;
  object: "model";
  owned_by: string;
  chat: (params: ChatCompletionMessageParam[]) => ChatResult;

  constructor(id: string, fn: (params: ChatCompletionMessageParam[]) => ChatResult) {
    this.created = 0;
    this.id = id;
    this.object = "model";
    this.owned_by = "loquacious";
    this.chat = fn;
  }
}

const KM_STATIC: string = "static";
const KM_ECHO: string = "echo";
const KM_CLOCK: string = "clock";

function dateTimeMessage() {
  const now = new Date();
  return `The date is ${now.toLocaleDateString()} and the time is ${now.toLocaleTimeString()}`;
}

/**
 * For testing.
 */
class FakeLlm implements Llm {
  baseUrl = "";
  name = "FakeLlm"
  enableHealth = false;
  currentModelKey = KM_ECHO;

  private readonly myModels: { [key: string]: FakeModel; } = {
    KM_STATIC: new FakeModel("static", (params: ChatCompletionMessageParam[]) => ({message: "fake chat result"})),
    KM_ECHO: new FakeModel("echo", (params: ChatCompletionMessageParam[]) => {
      try {
        return {message: (params!.filter(mp => mp.role === "user")!.pop())!.content.toString()!}
      } catch (err) {
        return {message: `I tried to be fake but I failed. Here's how it went down: ${err}`}
      }
    }),
    KM_CLOCK: new FakeModel("static", (params: ChatCompletionMessageParam[]) => ({message: dateTimeMessage()})),
  }

  chat(_params: ChatCompletionMessageParam[]): Promise<ChatResult> {
    return Promise.resolve(this.myModels[this.currentModelKey].chat(_params));
  }

  currentModel(): Promise<string> {
    return Promise.resolve(this.myModels[this.currentModelKey].id);
  }

  models(): Promise<Array<Model>> {
    return Promise.resolve(Object.values(this.myModels));
  }
}

export {FakeLlm};