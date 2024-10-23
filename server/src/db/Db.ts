import {Pool, type QueryResult} from "pg";
import {Deployment} from "../domain/Deployment";
import {Run} from "../domain/Run";
import {Session} from "../domain/Session";

class Db {
  private pool: Pool;
  /** The current Deployment */
  private run: Run | null = null;

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
    return this.run!;
  }

  async validate() {
    try {
      const r = await this.fetchRows("select 1", [])
      return r && r.length > 0;
    } catch (e) {
      console.error(`error validating database: ${e}`);
      return false;
    }
  }

  async fetchRows(query: string, values: string[]) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query(query, values);
      await client.query("COMMIT");
      return res.rows;
    } catch {
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  }

  async fetchOne<T>(query: string, values: string[]): Promise<T> {
    return this.fetchRows(query, values).then(r => {
      return r && r.length > 0 ? Promise.resolve(r[0]) : Promise.reject("not found");
    }, (reason) => {
      return Promise.reject(reason);
    });
  }

  async countQuery(query: string, values: string[]): Promise<number> {
    const result: { count: string } = await this.fetchOne(query, values);
    return parseInt(result.count);
  }

  async createDeployment(name: string, metadata: string): Promise<Deployment> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const q = `insert into deployment (name, metadata) values ($1, $2) returning deployment.*`;
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

  async createSession(run: Run):Promise<Session> {
    // TODO finish this implementation
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // get current run
      const qCreateSession = `insert into session (run) values ($1) returning session.*, run.* inner join run on session.run = run.id`;
      const insertSession = client.query(qCreateSession, [run.id]);
      return insertSession.then((result: QueryResult) => {
        if (result.rowCount === 1) {
          //const row = result.rows[0];
          //const session = new Session(row.id, row.created, row.run);
        }

        client.query("COMMIT");
        return Promise.reject();
      });
    } finally {
      client.release()
    }
  }

  async boot(deploymentName: string, sha1: string): Promise<Run> {
    console.log("booting database");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // get depoloyment and create run
      const qGetDeployment = `select * from deployment where name = $1`;
      const qCreateRun = `insert into run (sha1, deployment) values ($1, $2) returning *`;
      try {
        // look up the deployment
        console.log(`fetching "${deploymentName}" Deployment from db`);
        let result = await client.query(qGetDeployment, [deploymentName]);
        if (result.rowCount === 1) {
          console.log("found deployment");
          let row = result.rows[0];
          const deployment = new Deployment(row.id, row.created, row.name, row.metadata);
          console.log(`inserting Run in db`);
          result = await client.query(qCreateRun, [sha1, deployment.id]);
          if (result.rowCount === 1) {
            row = result.rows[0];
            this.run = new Run(row.id, row.created, row.metadata, row.sha1, deployment);
            await client.query("COMMIT");
            return Promise.resolve(this.run);
          } else {
            return Promise.reject("Could not insert new Run in db");
          }
        } else {
          console.log(`deployment rowcount = ${result.rowCount}`)
          return Promise.reject(`Deployment ${deploymentName} not found in db`);
        }
      } catch (e) {
        return Promise.reject(`problem fetching deployment or initialising run ${e}`);
      }
    } finally {
      client.release();
    }
  }
}

export default Db;