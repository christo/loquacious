import type {Run} from "./Run";

export class Session {
  id: number;
  created: Date;
  finished?: Date;
  run: Run;

  constructor(id: number, created: Date, run: Run) {
    this.id = id;
    this.created = created;
    this.run = run;
  }

  finish(finished = new Date()) {
    this.finished = finished;
  }
}