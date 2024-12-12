import {Pool, type QueryConfigValues, type QueryResult} from "pg";
import {AudioFile} from "../domain/AudioFile";
import {Creator} from "../domain/Creator";
import type {CreatorType} from "../domain/CreatorType";
import {Deployment} from "../domain/Deployment";
import {LipSync} from "../domain/LipSync";
import {Message} from "../domain/Message";
import {Run} from "../domain/Run";
import {Session} from "../domain/Session";
import {Tts} from "../domain/Tts";
import {VideoFile} from "../domain/VideoFile";
import {CreatorService} from "../system/CreatorService";


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

  getUserCreator(): Creator {
    return this.userCreator!;
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
      const r = await this.fetchRows("select 1", []);
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
    if (!this.booted || !this.run) {
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
          console.error(`deployment rows = ${result.rowCount}`);
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
   * For now, just fetches the most recently created open session for the current run.
   */
  async currentSession(): Promise<Session> {
    const query = `select *
                   from session
                   where finished is null
                     and run = $1
                   order by created desc
                   limit 1`;
    const run = this.getRun();
    const row = await this.fetchOne<number[], any>(query, [run.id]);
    return Promise.resolve(new Session(row.id, row.created, run));
  }

  /**
   * If there's a current session return it, otherwise create one.
   */
  async getOrCreateSession(): Promise<Session> {
    try {
      return await this.currentSession();
    } catch {
      return await this.createSession();
    }
  }

  /**
   * Finishes all incomplete sessions.
   */
  async finishAllSessions(): Promise<void> {
    console.log("finishing all current sessions");
    const q = `update session
               set finished = CURRENT_TIMESTAMP
               where finished is null`;
    const client = await this.pool.connect();
    try {
      await client.query(q);
    } finally {
      client.release();
    }
  }

  /**
   * Finishes any incomplete session attached to this run.
   */
  async finishCurrentSession(): Promise<void> {
    if (!this.booted) {
      return Promise.reject("db is not booted");
    }
    console.log("finishing current session of this run");
    const runId = this.getRun().id;
    const q = `update session
               set finished = CURRENT_TIMESTAMP
               where finished is null
                 and run = $1;`;
    const client = await this.pool.connect();
    try {
      await client.query(q, [runId]);
    } finally {
      client.release();
    }
  }

  async findCreatorForService(creator: CreatorService) {
    return this.findCreator(creator.getName(), creator.getMetadata(), true);
  }

  async findCreator(name: string, metadata: string | undefined, createIfMissing: boolean): Promise<Creator> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      let result;
      if (metadata) {
        const query = `select *
                       from creator
                       where name = $1
                         and metadata = $2
                       limit 1`;
        result = await client.query(query, [name, metadata]);
      } else {
        const query = `select *
                       from creator
                       where name = $1
                         and metadata is null
                       limit 1`;
        result = await client.query(query, [name]);
      }

      if (createIfMissing && result.rowCount === 0) {
        const query = `insert into creator (name, metadata)
                       values ($1, $2)
                       returning *`;
        const createResult = await client.query(query, [name, metadata]);
        if (createResult && createResult.rowCount === 1) {
          await client.query("commit");
          const row = createResult.rows[0];
          return Promise.resolve(new Creator(row.id, row.name, true, row.metadata));
        } else {
          await client.query("rollback");
          return Promise.reject("could not create creator")
        }
      } else if (result.rowCount === 1) {
        await client.query("commit");
        return Promise.resolve(result.rows[0] as Creator);
      } else {
        await client.query("rollback");
        return Promise.reject(`could not find creator ${name} ${metadata}`);
      }
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
   * @param content the message text
   */
  async createUserMessage(session: Session, content: string): Promise<Message> {
    return this.createMessage(session, content, this.userCreator!);
  }

  /**
   * Stores a message with the given content for the given session by the creator identified by the given
   * CreatorType implementation. Ensures the message is hooked up in the database.
   * @param session current session
   * @param content message text
   * @param creatorType who created it
   */
  async createCreatorTypeMessage(session: Session, content: string, creatorType: CreatorType): Promise<Message> {
    const creator = await this.findCreator(creatorType.getName(), creatorType.getMetadata(), true);
    return this.createMessage(session, content, creator);
  }

  async createMessage(session: Session, message: string, creator: Creator): Promise<Message> {
    if (!this.booted) {
      return Promise.reject("db is not booted");
    }
    // create message for session with incremented sequence number
    const query = `with max_sequence as
                            (select coalesce(max(m.sequence), 0) as max_seq from message m where session = $2)
                   insert
                   into message (content, session, creator, sequence)
                   values ($1, $2, $3, (select max_seq + 1 from max_sequence))
                   returning *`;
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, [message, session.id, creator.id]);
      if (result.rowCount === 1) {
        const row = result.rows[0];
        return new Message(row.id, row.created, row.content, row.creator, row.creator === this.getUserCreator().id);
      } else {
        return Promise.reject("no rows returned from append message query");
      }
    } finally {
      client.release();
    }
  }

  /**
   * Fetch all the messages for a session in sequence order.
   * @param session
   */
  async getMessages(session: Session): Promise<Message[]> {
    if (!this.booted) {
      throw new Error("db is not booted");
    }
    // TODO join db ids of video, or if absent, speech and provide replay button for speech bubble ui
    const query = `select m.id,
                          m.created,
                          m.content,
                          m.creator
                   from message m
                   where m.session = $1
                   order by m.sequence`;
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, [session.id]);
      // may be empty
      return result.rows.map((r: any) => {
        return new Message(r.id, r.created, r.content, r.creator, r.creator === this.getUserCreator().id);
      });
    } finally {
      client.release();
    }
  }

  /**
   * Creates an audio file record.
   * @param mimeType of the audio
   * @param creatorId linking to the originator
   * @param durationMs if optional, database will get -1
   */
  async createAudioFile(mimeType: string, creatorId: number, durationMs: number = -1): Promise<AudioFile> {
    const query = `insert into audio (duration_ms, mime_type, creator)
                   values ($1, $2, $3)
                   returning *`;
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, [durationMs, mimeType, creatorId]);
      if (result.rowCount === 1) {
        const r = result.rows[0];
        return new AudioFile(r.id, r.created, r.duration_ms, r.mime_type, r.creator);
      } else {
        return Promise.reject("Could not create audio file");
      }
    } finally {
      client.release();
    }
  }

  async createVideoFile(mimeType: string, creatorId: number, durationMs: number = -1): Promise<VideoFile> {
    const query = `insert into video (duration_ms, mime_type, creator)
                   values ($1, $2, $3)
                   returning *`;
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, [durationMs, mimeType, creatorId]);
      if (result.rowCount === 1) {
        const r = result.rows[0];
        return new VideoFile(r.id, r.created, r.duration_ms, r.mime_type, r.creator);
      } else {
        return Promise.reject("Could not create video file");
      }
    } finally {
      client.release();
    }
  }

  /**
   * Insert a {@link Tts} domain object in the database with the given attributes.
   * @param creatorId the id of the {@link Creator} that generated the audio.
   * @param messageId the id of the {@link Message} that was spoekn
   * @param audioFileId the id of the {@link AudioFile} on the filesystem.
   */
  async createTts(creatorId: number, messageId: number, audioFileId: number): Promise<Tts> {
    const query = `insert into tts (creator, input, output)
                   values ($1, $2, $3)
                   returning *`;
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, [creatorId, messageId, audioFileId]);
      if (result.rowCount === 1) {
        const r = result.rows[0];
        return new Tts(r.id, r.created, creatorId, messageId, audioFileId);
      } else {
        return Promise.reject("Could not create Tts");
      }
    } finally {
      client.release();
    }
  }

  async createLipSync(creatorId: number, ttsId: number, videoFileId: number): Promise<LipSync> {
    const query = `insert into lipsync (creator, input, output)
                   values ($1, $2, $3)
                   returning *`;
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, [creatorId, ttsId, videoFileId]);
      if (result.rowCount === 1) {
        const r = result.rows[0];
        return new LipSync(r.id, r.created, creatorId, ttsId, videoFileId);
      } else {
        return Promise.reject("Could not create LipSync");
      }
    } finally {
      client.release();
    }
  }
}

export default Db;