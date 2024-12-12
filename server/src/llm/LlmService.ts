import {FakeLlm} from "./FakeLlm";
import {LlamaCppLlm} from "./LlamaCppLlm";
import type {Llm} from "./Llm";
import {LmStudioLlm} from "./LmStudioLlm";
import {OpenAiLlm} from "./OpenAiLlm";
import {GateWay} from "../system/GateWay";
import {EventEmitter} from "../system/EventEmitter";

/**
 * Configurable gateway to LLM implementations.
 * Holds currently configured LLM.
 */
class LlmService implements GateWay<Llm> {

  private readonly llms: Llm[];
  private llmIndex = 0;
  private readonly FAKE = new FakeLlm();
  readonly FALLBACK: Llm =  this.FAKE;

  constructor() {
    this.llms = [
      new LlamaCppLlm(),
      new OpenAiLlm(),
      new LmStudioLlm(),
      this.FAKE
    ].filter((llm: Llm) => llm.canRun())
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
        console.log(`changing LLM system to ${value}`);
      }
    }
  }
}

export default LlmService;