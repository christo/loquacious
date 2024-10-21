import {Pool} from "pg";

class Db {
  private pool: Pool;

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
}

export default Db;