import {LoqModule} from "../system/LoqModule";
import type {ChatInput, ChatResult, Llm} from "./Llm";
import Db from "../db/Db";

export class LlmLoqModule implements LoqModule<ChatInput, ChatResult> {
  private readonly llm: Llm;
  private readonly _db: Db;

  constructor(llm: Llm, db: Db) {
    this._db = db;
    this.llm = llm;
  }

  async call(input: Promise<ChatInput>): Promise<ChatResult> {
    // TODO move db logic from server here
    return this.llm.chat(await input.then(cr => cr.params));
  }
}