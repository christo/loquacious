import {WorkflowStep} from "./WorkflowStep";

export interface WorkflowEvents {

  /**
   * Report reaching the given {@link WorkflowStep}
   * @param workflow
   */
  workflow(workflow: WorkflowStep): void;

}