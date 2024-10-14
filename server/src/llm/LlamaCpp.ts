import type {BackEnd} from "llm/BackEnd";

class LlamaCpp implements BackEnd {
  baseUrl = "http://localhost:8080";
  enableHealth = true;
  name = "Llama.cpp";

  async models(): Promise<Array<string>> {
    return Promise.resolve(["TODO"]);
  }

}

export {LlamaCpp};