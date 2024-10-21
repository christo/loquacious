import type {ChatResult, Llm} from "llm/Llm";
import OpenAI from "openai";
import ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;
import Model = OpenAI.Model;

class FakeLlm implements Llm {
  baseUrl = "";
  name = "Fake Llm"
  enableHealth = false;

  private mymodel = {
    id: "fake",
    created: Date.now(),
    object: 'model',
    owned_by: "christo"
  }

  private readonly result: ChatResult = {message: "fake chat result"};

  chat(_params: ChatCompletionMessageParam[]): Promise<ChatResult> {
    return Promise.resolve(this.result);
  }

  currentModel(): Promise<string> {
    return Promise.resolve(this.mymodel.id);
  }

  models(): Promise<Array<Model>> {
    return Promise.resolve([this.mymodel as Model]);
  }
}

export {FakeLlm};