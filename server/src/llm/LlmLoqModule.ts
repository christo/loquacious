import {LoqModule} from "../system/LoqModule";
import type {LlmInput, LlmResult, Llm} from "./Llm";
import Db from "../db/Db";
import {WorkflowEvents} from "../system/WorkflowEvents";

export class LlmLoqModule implements LoqModule<LlmInput, LlmResult> {
  private readonly llm: Llm;
  private readonly _db: Db;
  private _workflowEvents: WorkflowEvents;

  constructor(llm: Llm, db: Db, workflowEvents: WorkflowEvents) {
    this._db = db;
    this.llm = llm;
    this._workflowEvents = workflowEvents;
  }

  async call(input: Promise<LlmInput>): Promise<LlmResult> {
    // TODO move db logic from server here
    try {
      this._workflowEvents.workflow("llm_request");
      return this.llm.chat(await input.then(cr => {
        this._workflowEvents.workflow("llm_response");
        return cr.getParams()
      }));
    } catch (error: any) {
      return Promise.reject(error);
    }
  }
}