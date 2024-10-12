type BackEnd = {
  name: string,
  baseUrl: string | undefined,
  enableHealth: boolean,
}

class LlamaCpp implements BackEnd {
  baseUrl = "http://localhost:8080";
  enableHealth = true;
  name = "Llama.cpp";
}

class LmStudio implements BackEnd {
  baseUrl = "http://localhost:8080/v1";
  enableHealth = false;
  name = "LM-Studio";
}

class OpenAi implements BackEnd {
  baseUrl = undefined;
  enableHealth = false;
  name = "ChatGPT";
}

export type {BackEnd};
export {LlamaCpp, LmStudio, OpenAi};