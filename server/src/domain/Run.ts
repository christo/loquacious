import type {Deployment} from "./Deployment";

export class Run {
  id: number;
  created: Date;
  metadata: string;
  sha1: string;
  deployment: Deployment;


  constructor(id: number, created: Date, metadata: string, sha1: string, deployment: Deployment) {
    this.id = id;
    this.created = created;
    this.metadata = metadata;
    this.sha1 = sha1;
    this.deployment = deployment;
  }

}