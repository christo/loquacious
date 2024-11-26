import {EventChannel, EventEmitter, LoqEvent} from "../system/EventEmitter";
import {LoqModule} from "../system/LoqModule";
import type {ChatInput, ChatResult, Llm} from "./Llm";

export class LlmLoqModule extends EventEmitter implements LoqModule<ChatInput, ChatResult> {
  private readonly llm: Llm;

  constructor(llm: Llm) {
    super(llm.getName());
    this.llm = llm;
  }

  async call(input: Promise<ChatInput>): Promise<ChatResult> {
    return this.llm.chat(await input.then(cr => cr.params));
  }

  on(event: EventChannel, handler: (event: LoqEvent) => void): void {
    super.addHandler(event, handler);
  }
}