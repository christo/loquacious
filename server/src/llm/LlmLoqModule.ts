import {LoqModule} from "../system/LoqModule";
import type {LlmResult, Llm} from "./Llm";
import Db from "../db/Db";
import {WorkflowEvents} from "../system/WorkflowEvents";
import {LlmInput} from "./LlmInput";
import {Message} from "../domain/Message";
import {Loquacious} from "../system/Loquacious";

export class LlmLoqModule implements LoqModule<LlmInput, LlmResult> {
  private readonly llm: Llm;
  private readonly _db: Db;
  private _workflowEvents: WorkflowEvents;
  private _loq: Loquacious;

  constructor(llm: Llm, db: Db, workflowEvents: WorkflowEvents, loq: Loquacious) {
    this._db = db;
    this.llm = llm;
    this._workflowEvents = workflowEvents;
    this._loq = loq;
  }

  async call(input: Promise<LlmInput>): Promise<LlmResult> {
    // TODO move db logic from server here
    try {
      this._workflowEvents.workflow("llm_request");
      // get message history for session
      return this.llm.chat(await input.then(cr => {
        this._workflowEvents.workflow("llm_response");
        return cr.getParams()
      }));
    } catch (error: any) {
      return Promise.reject(error);
    }
  }
}