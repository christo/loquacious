import {Pool, type QueryConfigValues, type QueryResult} from "pg";
import {Creator} from "../domain/Creator";
import {Deployment} from "../domain/Deployment";
import {Run} from "../domain/Run";
import {Session} from "../domain/Session";

export const CREATOR_USER_NAME = 'user';


class Db {
  private pool: Pool;

  /**
   * Created on boot and cached in memory until shutdown.
   * @private
   */
  private run: Run | null = null;

  /**
   * Is false until boot() is called.
   * @private
   */
  private booted: boolean = false;

  /** Will be fetched on boot. */
  private userCreator: Creator | null = null;

  constructor(poolSize: number) {
    this.pool = new Pool({
      max: poolSize
    });
    this.pool.on('error', (err, poolClient) => {
      // this doesn't seem to ever happen in practice
      console.error('Unexpected error on idle client', err);
      poolClient.release(err);
    });
  }

  getRun(): Run {
    if (!this.booted) {
      throw Error("system has not booted");
    } else if (this.run === null) {
      throw Error("system invariant violated: booted but no run!");
    }
    return this.run!;
  }

  /**
   * Returns true if database connection is good.
   */
  async validate(): Promise<boolean> {
    try {
      const r = await this.fetchRows("select 1", [])
      return r!.length > 0;
    } catch (e) {
      console.error(`error validating database: ${e}`);
      return false;
    }
  }

  async fetchRows<V>(query: string, values: QueryConfigValues<V>): Promise<Array<any>> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query(query, values);
      await client.query("COMMIT");
      if (res.rows === undefined) {
        return Promise.reject("no rows bro");
      }
      return res.rows;
    } catch (e) {
      await client.query("ROLLBACK");
      return Promise.reject(e);
    } finally {
      client.release();
    }
  }

  async fetchOne<V, T>(query: string, values: QueryConfigValues<V>): Promise<T> {
    return this.fetchRows(query, values).then(r => {
      return r && r.length > 0 ? Promise.resolve(r[0]) : Promise.reject("not found");
    }, (reason) => {
      return Promise.reject(reason);
    });
  }

  // noinspection JSUnusedGlobalSymbols
  async countQuery<V>(query: string, values: QueryConfigValues<V>): Promise<number> {
    const result: { count: string } = await this.fetchOne(query, values);
    return parseInt(result.count);
  }

  // noinspection JSUnusedGlobalSymbols
  async createDeployment(name: string, metadata: string): Promise<Deployment> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const q = `insert into deployment (name, metadata)
                 values ($1, $2)
                 returning deployment.*`;
      const insertSession = client.query(q, [name, metadata]);
      return insertSession.then((result: QueryResult) => {
        if (result.rowCount === 1) {
          const row = result.rows[0];
          return new Deployment(row.id, row.created, row.name, row.metadata);
        }

        client.query("COMMIT");
        return Promise.reject();
      });
    } finally {
      client.release()
    }
  }

  async createSession(): Promise<Session> {
    if (!this.booted || this.run) {
      return Promise.reject("No current Run - has boot() not been run or failed?");
    } else {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        // get current run
        const res = await client.query(
          `insert into session (run)
           values ($1)
           returning session.*`, [this.run!.id]
        );
        if (res.rowCount === 1) {
          const session = new Session(res.rows[0].id, res.rows[0].created, this.run!);
          await client.query("COMMIT");
          return Promise.resolve(session);
        } else {
          return Promise.reject(`Got ${res.rowCount} rows for Session, expecting 1`);
        }
      } finally {
        client.release()
      }
    }
  }

  async boot(deploymentName: string, sha1: string): Promise<Run> {
    console.log("booting database");
    const dbValid = this.validate();
    if (!dbValid) {
      return Promise.reject("Database not valid");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // get depoloyment and create run
      const qGetDeployment = `select *
                              from deployment
                              where name = $1`;
      const qCreateRun = `insert into run (sha1, deployment)
                          values ($1, $2)
                          returning *`;
      const qGetUserCreator = "select * from creator where name = $1 order by id desc";
      try {
        // decided not to finish sessions from previous run so sessions can survive reboot
        // but they're associated with their original run so needs a mild rethink
        // look up the deployment
        //console.log(`fetching "${deploymentName}" Deployment from db`);
        let result = await client.query(qGetDeployment, [deploymentName]);
        if (result.rowCount === 1) {
          console.log(`Loaded ${deploymentName} deployment`);
          let row = result.rows[0];
          const deployment = new Deployment(row.id, row.created, row.name, row.metadata);
          console.log(`inserting Run in db`);
          result = await client.query(qCreateRun, [sha1, deployment.id]);
          if (result.rowCount === 1) {
            row = result.rows[0];
            this.run = new Run(row.id, row.created, row.metadata, row.sha1, deployment);
            console.log(`Initialising run ${this.run.id}`);
            result = await client.query(qGetUserCreator, [CREATOR_USER_NAME]);
            if (result.rowCount && result.rowCount >= 1) {
              row = result.rows[0];
              this.userCreator = new Creator(row.id, row.name, row.metadata);
              await client.query("COMMIT");
              this.booted = true;
              return Promise.resolve(this.run);
            } else {
              return Promise.reject(`Found ${result.rowCount} rows for user creator`);
            }
          } else {
            return Promise.reject("Could not insert new Run in db");
          }
        } else {
          console.error(`deployment rows = ${result.rowCount}`)
          return Promise.reject(`Unique ${deploymentName} deployment not found in db`);
        }
      } catch (e) {
        return Promise.reject(`problem fetching deployment or initialising run ${e}`);
      }
    } finally {
      client.release();
    }
  }

  /**
   * For now, just fetches the most recently created session for the current run.
   */
  async currentSession(): Promise<Session> {
    const query = `select * from session
     where finished is null
       and run = $1
     order by created
     limit 1`;
    const session = await this.fetchOne<number[], Session>(query, [this.getRun().id]);
    console.log(`query is: ${query}`)
    console.dir({session: session});
    // TODO verify this works before returning resolved promise.
    if (2 * 4 > 1) {
      throw Error("Guru Meditation Error");
    }
    return Promise.resolve(session);
  }

  async finishAllSessions(): Promise<void> {
    console.log("finishing all current sessions");
    const q = `update session set finished = CURRENT_TIMESTAMP where finished is null`;
    const client = await this.pool.connect();
    try {
      await client.query(q);
    } finally {
      client.release();
    }
  }

  async finishCurrentSession(): Promise<void> {
    if (!this.booted) {
      return Promise.reject("db is not booted");
    }
    console.log("finishing current session of this run");
    const runId = this.getRun().id
    const q = `update session set finished = CURRENT_TIMESTAMP where finished is null and run = $1;`;
    const client = await this.pool.connect();
    try {
      await client.query(q, [runId]);
    } finally {
      client.release();
    }
  }

  /**
   * Append and store the given user text to the given session. Text content is stored directly in the db
   * so no file references are needed and no filesystem io should be performed. The creator is the fixed
   * Creator instance created by the db bootstrap, indicating human user input.
   *
   * @param session the session to add the message to
   * @param message the message text
   */
  async appendUserText(session: Session, message: string): Promise<void> {
    if (!this.booted) {
      return Promise.reject("db is not booted");
    }
    const query = `with max_sequence as
                            (select coalesce(max(m.sequence), 0) as max_seq from message m where session = $2)
                   insert
                   into message (content, session, creator, sequence)
                   values ($1, $2, $3, (select max_seq + 1 from max_sequence))`;
    const client = await this.pool.connect();
    try {
      await client.query(query, [message, session.id, this.userCreator!.id]);
    } finally {
      client.release();
    }
  }
}

export default Db;