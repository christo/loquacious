type BackEnd = {
  name: string,
  baseUrl: string | undefined,
  enableHealth: boolean,
  models: () => Promise<Array<string>>
}

class LlamaCpp implements BackEnd {
  baseUrl = "http://localhost:8080";
  enableHealth = true;
  name = "Llama.cpp";

  async models(): Promise<Array<string>> {
    return Promise.resolve(["TODO"]);
  }

}

class LmStudio implements BackEnd {
  baseUrl = "http://localhost:8080/v1";
  enableHealth = false;
  name = "LM-Studio";
  async models(): Promise<Array<string>> {
    return Promise.resolve(["TODO"]);
  }
}

class OpenAi implements BackEnd {
  baseUrl = undefined;
  enableHealth = false;
  name = "ChatGPT";
  async models(): Promise<Array<string>> {
    return Promise.resolve(["TODO"]);
  }
}

export type {BackEnd};
export {LlamaCpp, LmStudio, OpenAi};