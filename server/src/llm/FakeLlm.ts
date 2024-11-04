import type {ChatResult, Llm} from "llm/Llm";
import OpenAI from "openai";
import {always} from "../system/config";
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

function dateTimeMessage() {
  const now = new Date();
  return `The date is ${now.toLocaleDateString()} and the time is ${now.toLocaleTimeString()}`;
}

/**
 * For testing.
 */
class FakeLlm implements Llm {
  readonly baseUrl = undefined;
  private readonly name = "FakeLlm"
  readonly enableHealth = false;
  canRun = always;
  private currentModelKey = "echo";
  private readonly myModels: { [key: string]: FakeModel; } = {
    static: new FakeModel("static", (params: ChatCompletionMessageParam[]) => ({message: "fake chat result"})),
    echo: new FakeModel("echo", (params: ChatCompletionMessageParam[]) => {
      try {
        return {message: (params!.filter(mp => mp.role === "user")!.pop())!.content.toString()!}
      } catch (err) {
        return {message: `I tried to be fake but I failed. Here's how it went down: ${err}`}
      }
    }),
    clock: new FakeModel("clock", (params: ChatCompletionMessageParam[]) => ({message: dateTimeMessage()})),
  }

  chat(_params: ChatCompletionMessageParam[]): Promise<ChatResult> {
    return Promise.resolve(this.myModels[this.currentModelKey].chat(_params));
  }

  currentModel(): Promise<string> {
    return Promise.resolve(this.myModels[this.currentModelKey].id);
  }

  setCurrentOption(value: string): Promise<void> {
    for (let m of Object.keys(this.myModels)) {
      if (m === value) {
        this.currentModelKey = m;
        return Promise.resolve();
      }
    }
    return Promise.reject(`${this.name}: Unknown model: ${value}`);
  }

  models(): Promise<Array<Model>> {
    return Promise.resolve(Object.values(this.myModels));
  }

  getMetadata(): string | undefined {
    return this.currentModelKey;
  }

  getName(): string {
    return this.name;
  }

  configure(metadata: string): Promise<void> {
    if (Object.keys(this.myModels).includes(metadata)) {
      this.currentModelKey = metadata;
      return Promise.resolve();
    } else {
      return Promise.reject();
    }
  }

  free(): boolean {
    return true;
  }
}

export {FakeLlm};