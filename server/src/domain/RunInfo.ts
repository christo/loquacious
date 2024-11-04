import {Run} from "./Run";

/**
 * Like {@link Run} with ISO serialised dates.
 */
class RunInfo {
  id: number;
  created: string;
  metadata: string;
  sha1: string;
  deployment: {
    id: number;
    created: string;
    name: string;
    metadata: string;
  }

  constructor(run: Run) {
    this.id = run.id;
    this.created = run.created.toISOString();
    this.metadata = run.metadata;
    this.sha1 = run.sha1;
    this.deployment = {
      id: run.deployment.id,
      created: run.deployment.created.toISOString(),
      metadata: run.deployment.metadata,
      name: run.deployment.name,
    }
  }
}

export {RunInfo};