import type {BackEnd} from "llm/BackEnd";

class OpenAi implements BackEnd {
  baseUrl = undefined;
  enableHealth = false;
  name = "ChatGPT";

  async models(): Promise<Array<string>> {
    return Promise.resolve(["TODO"]);
  }
}

export {OpenAi};