import {fileStream} from "api/mediaStream";
import cors from 'cors';
import dotenv from 'dotenv';
import express, {Request, Response} from 'express';
import {ImageInfo} from "image/ImageInfo";
import {getCurrentCommitHash} from "system/config";
import {timed} from "system/performance";
import Undici, {setGlobalDispatcher} from "undici";
import Db from "./db/Db";
import {StreamServer} from "./StreamServer";
import {Loquacious} from "./system/Loquacious";
import {SpeechResult} from "./speech/SpeechResult";
import {LipSyncResult} from "./lipsync/LipSyncAnimator";
import {PortraitSystem} from "./image/PortraitSystem";
import Agent = Undici.Agent;

// we do this because worst-case remote calls are hella slow
setGlobalDispatcher(new Agent({connect: {timeout: 300_000}}));

// Load environment variables
dotenv.config();

const BASE_WEB_ROOT = "../public";
const portraitSystem = new PortraitSystem(BASE_WEB_ROOT);

if (!process.env.DATA_DIR) {
  console.error("ensure environment variable DATA_DIR is set");
}
const PATH_BASE_DATA: string = process.env.DATA_DIR!;

// const llms = new LlmService();
const db = new Db(process.env.DB_POOL_SIZE ? parseInt(process.env.DB_POOL_SIZE, 10) : 10);
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
const wsPort = parseInt(process.env.WEBSOCKET_PORT || "3002", 10);
// TODO remove hardcoding of devserver for cors host
const streamServer = new StreamServer(app, wsPort, "http://localhost:5173");
const loq = new Loquacious(PATH_BASE_DATA, db, streamServer);

app.get("/portraits", async (_req: Request, res: Response) => {
  res.json({
    portraitBaseUrl: portraitSystem.baseUrl(),
    dimension: portraitSystem.dimension(),
    images: await ImageInfo.getImageInfos(portraitSystem.path())
  });
});

app.get("/portrait/:portraitname", async (req: Request, _res: Response) => {
  // noinspection JSUnusedLocalSymbols
  const _portraitname = req.params.portraitname;
  // TODO finish implementation using req.sendFile
});

/**
 * Modify current system settings - body should be partial SystemSummary.
 * Returns the new system summary
 */
app.post("/system/", async (req: Request, res: Response) => {
  await mkFailable(res)("update system settings", async () => {
    for (const [k, value] of Object.entries<string>(req.body)) {
      switch (k) {
        case "mode":
          loq.modes.setCurrent(value);
          break;
        case "llm":
          loq.setCurrentLlm(value);
          break;
        case "llm_option":
          await loq.setLlmOption(value);
          break;
        case "tts":
          await loq.setCurrentTts(value);
          break;
        case "tts_option":
          await loq.setTtsOption(value);
          break;
        case "lipsync":
          loq.setCurrentAnimator(value);
          break;
        default:
          console.log(`system setting update for ${k} not supported`);
      }
    }
    res.json(await loq.getSystemSummary());
  });
});

/**
 * Get current system settings.
 */
app.get("/system", async (_req: Request, res: Response) => {
  res.json(await loq.getSystemSummary());
});

/**
 * Front end request for a new session.
 */
app.put("/session", async (_req: Request, res: Response) => {
  await mkFailable(res)("creating new session", () =>
      loq.newSession().then(s => res.json(s)));
});

app.get('/session', async (_req: Request, res: Response) => {
  try {
    res.json(await loq.getSession());
  } catch (e) {
    res.status(404).json({message: "no current session"}).end();
  }
});

app.get('/api/chat', async (_req: Request, res: Response) => {
  await mkFailable(res)("get chat", async () => {
    const session = await loq.getSession();
    res.json({
      response: {
        session: session.id,
        messages: await db.getMessages(session)
      }
    });
  });
});

/**
 * Curried generic labelled function execution and failure reporting to Response and streamServer.
 * On success, the returned promise of fn is returned.
 * @param res response to use for reporting any failure
 * @return function as follows:
 *     param: name label to use for failure reporting
 *     param: fn the function to call
 *     return: on success the resolved value from fn, on failure, a rejected promise.
 */
const mkFailable = (res: Response) =>
    async <T>(name: string, fn: () => Promise<T>) => {
      try {
        return await fn();
      } catch (e) {
        const msg = `${name} failed`;
        console.error(msg, e);
        res.status(500).json({error: msg}).end();
        streamServer.error(msg);
        return Promise.reject(e);
      }
    };


app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  // noinspection ES6MissingAwait
  timed("post /api/chat", async () => {
    const {prompt, portrait} = req.body;
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || !cleanPrompt.length) {
      res.status(400).json({error: 'No prompt provided'});
    } else {
      const failable = mkFailable(res);

      const llmResultPromise = failable("loquacious chat", async () => {
        const llmInput = loq.createLlmInput(cleanPrompt);
        const loqModule = await loq.getLlmLoqModule();
        return loqModule.call(llmInput);
      });

      const speechResultPromise = failable("speech generation",
          async () => loq.getTtsLoqModule().call(loq.createTtsInput(llmResultPromise))
      );

      const lipSyncResult = failable("lipsync generation", async () => {
        const animateLoqModule = loq.getLipSyncLoqModule();
        const portraitPath = portraitSystem.getPortraitPath(portrait);
        const lipSyncInput = loq.createLipSyncInput(speechResultPromise, portraitPath);
        return animateLoqModule.call(lipSyncInput);
      });

      const lr = await llmResultPromise;
      const messages = (await db.getMessages(await loq.getSession())).map(m => {
        return lr.targetTts.removePauseCommands(m);
      });
      const sr: SpeechResult = await speechResultPromise;
      const lsr: LipSyncResult = await lipSyncResult;

      // at this point all promises should be awaited so any failures are caught in time to write
      // error to response before happy path gets started.
      console.log("sending final success response");
      res.json(({
        response: {
          portrait: portrait,
          messages: messages,
          speech: sr.filePath(),
          lipsync: lsr,
          llm: lr.llm,
          model: lr.model,
        }
      }));
    }
  })
});

/**
 * Endpoint to stream the given audio file.
 */
app.get('/audio', async (req: Request, res: Response) => fileStream(req.query.file!.toString(), res));

/**
 * Endpoint to stream the given video file.
 */
app.get('/video', async (req: Request, res: Response) => fileStream(req.query.file!.toString(), res));

// Start the server
app.listen(port, async () => {
  const hash = await getCurrentCommitHash(process.cwd());
  await db.boot(process.env.DEPLOYMENT_NAME!, hash);
  await loq.initialiseCreatorTypes();
  await timed("prescaling images", portraitSystem.prescaleImages);
  console.log(`Server is running on port ${port}`);
  const systemSummary = await loq.getSystemSummary();
  console.log(`LLM: ${(systemSummary.llm.current)}`);
  console.log(`LLM health check: ${systemSummary.health.message}`);
  console.log(`LLM current model: ${systemSummary.llm.currentOption.id}`);
  const models = systemSummary.llm.options.map(m => m.id);
  console.log(`LLM available models (${models.length}):`);
  models.forEach(m => console.log(`   ${m}`));
  console.log(`Current Speech System: ${systemSummary.tts.current} ${systemSummary.tts.currentOption.descriptor()}`);
  console.log(`Current LipSync: ${systemSummary.lipsync.current}`);
});