import {FakeLlm} from "./FakeLlm";
import {LlamaCppLlm} from "./LlamaCppLlm";
import type {Llm} from "./Llm";
import {LmStudioLlm} from "./LmStudioLlm";
import {OpenAiLlm} from "./OpenAiLlm";

class LlmService {

  private readonly llms: Llm[];
  private llmIndex = 0;

  constructor() {
    this.llms = [
      new OpenAiLlm(),
      new LlamaCppLlm(),
      new LmStudioLlm(),
      new FakeLlm()
    ].filter(s => s.canRun())
  }

  current(): Llm {
    return this.llms[this.llmIndex];
  }

  all() {
    return [...this.llms];
  }

  setCurrent(value: string) {
    for (let i = 0; i < this.llms.length; i++) {
      if(this.llms[i].getName() === value) {
        this.llmIndex = i;
      }
    }
  }
}

export default LlmService;