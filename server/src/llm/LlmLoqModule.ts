import {LoqModule} from "../system/LoqModule";
import {Llm, LlmResult, LlmResultStruct} from "./Llm";
import Db from "../db/Db";
import {WorkflowEvents} from "../system/WorkflowEvents";
import {LlmInput} from "./LlmInput";
import {Session} from "../domain/Session";
import {timed} from "../system/performance";

export class LlmLoqModule implements LoqModule<LlmInput, LlmResult> {
  private readonly llm: Llm;
  private readonly _db: Db;
  private readonly workflowEvents: WorkflowEvents;
  private readonly session: Session;

  constructor(llm: Llm, db: Db, workflowEvents: WorkflowEvents, session: Session) {
    this._db = db;
    this.llm = llm;
    this.workflowEvents = workflowEvents;
    this.session = session;
  }

  async call(input: Promise<LlmInput>): Promise<LlmResult> {
    // TODO move db logic from server here
    try {
      this.workflowEvents.workflow("llm_request");
      // get message history for session
      const params = await input.then(llmInput => {
        return llmInput.getParams()
      });
      const result = await timed("llm text generation", () => this.llm.chat(params));
      this.workflowEvents.workflow("llm_response");
      if (result.message) {
        const text = result.message!;
        const llmMessage = await timed("storing llm response",
            () => this._db.createCreatorTypeMessage(this.session, text, this.llm)
        );
        return new LlmResultStruct(result.llm, llmMessage, text, result.model, (await input).targetTts());
      } else {
        console.log("not sure how to tell you this but there was no result message...");
        return Promise.reject("cattle mutilations are up");
      }

    } catch (error: any) {
      return Promise.reject(error);
    }
  }

  private async createResult(result: LlmResult) {

  }
}