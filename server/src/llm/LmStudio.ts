import type {BackEnd} from "llm/BackEnd";

class LmStudio implements BackEnd {
  baseUrl = "http://localhost:8080/v1";
  enableHealth = false;
  name = "LM-Studio";

  async models(): Promise<Array<string>> {
    return Promise.resolve(["TODO"]);
  }
}

export {LmStudio};