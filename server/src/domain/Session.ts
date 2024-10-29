import type {Persistent} from "../db/Persistent";
import type {Run} from "./Run";

/**
 * Aggregates a sequence of interactions with a user. System may support multiple sessions with authenticated
 * users in future that are bound to the user application session.
 */
export class Session implements Persistent<Session> {
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

  toPostgres(prepareValue: (value: Session) => any): any {
    // currently unimplemented
  }
}