import {fileStream} from "api/mediaStream";
import cors from 'cors';
import dotenv from 'dotenv';
import express, {Request, Response} from 'express';
import {promises} from 'fs';
import {ImageInfo} from "image/ImageInfo";
import {prescaleImages} from "image/imageOps";
import type {LipSyncInput, LipSyncResult} from "lipsync/LipSyncAnimator";
import {supportedImageTypes} from "media";
import type {Dirent} from "node:fs";
import * as path from 'path';
import {AsyncSpeechResult, SpeechInput, SpeechResult} from "speech/SpeechSystem";
import {getCurrentCommitHash} from "system/config";
import {timed} from "system/performance";
import Undici, {setGlobalDispatcher} from "undici";
import Db from "./db/Db";
import type {AudioFile} from "./domain/AudioFile";
import type {CreatorType} from "./domain/CreatorType";
import {Message} from "./domain/Message";
import type {VideoFile} from "./domain/VideoFile";
import {Dimension} from "./image/Dimension";
import {StreamServer} from "./StreamServer";
import {Loquacious} from "./system/Loquacious";
import Agent = Undici.Agent;


setGlobalDispatcher(new Agent({connect: {timeout: 300_000}}));

// Load environment variables
dotenv.config();

const BASE_WEB_ROOT = "../public";
/** file path relative to server module root */
const BASE_PATH_PORTRAIT = `${BASE_WEB_ROOT}/img`;
const PORTRAIT_DIMS: Dimension[] = [
  {width: 608, height: 800},
  {width: 1080, height: 1920}
];
const dimIndex = 0;
const portraitBaseUrl = () => `/img/${PORTRAIT_DIMS[dimIndex].width}x${PORTRAIT_DIMS[dimIndex].height}`;
const pathPortrait = () => `${BASE_WEB_ROOT}${portraitBaseUrl()}`;
console.log(`path portrait: ${pathPortrait()}`);

if (!process.env.DATA_DIR) {
  console.error("ensure environment variable DATA_DIR is set");
}
const PATH_BASE_DATA: string = process.env.DATA_DIR!;

// const llms = new LlmService();
const db = new Db(process.env.DB_POOL_SIZE ? parseInt(process.env.DB_POOL_SIZE, 10) : 10);
const loq = new Loquacious(PATH_BASE_DATA, db);
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
const wsPort = parseInt(process.env.WEBSOCKET_PORT || "3002", 10);
// TODO remove hardcoding of devserver for cors host
const streamServer = new StreamServer(app, wsPort, "http://localhost:5173");

app.get("/portraits", async (_req: Request, res: Response) => {
  const exts = supportedImageTypes().flatMap(f => f.extensions).map(f => `.${f}`);
  const allEntries = await promises.readdir(pathPortrait(), {withFileTypes: true});
  const goodExt = (f: Dirent) => exts.includes(path.extname(f.name).toLowerCase());
  const imgFiles = allEntries.filter(f => f.isFile() && goodExt(f));
  const imageInfos = await Promise.all(imgFiles.map((de: Dirent) => ImageInfo.fromFile(pathPortrait(), de.name)));
  res.json({
    portraitBaseUrl: portraitBaseUrl(),
    dimension: PORTRAIT_DIMS[dimIndex],
    images: imageInfos
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
  await failable(res, "update system settings", async () => {
    const keys = Object.getOwnPropertyNames(req.body);
    for (const k of keys) {
      const value = req.body[k];
      switch (k) {
        case "mode":
          loq.modes.setCurrent(value);
          break;
        case "llm":
          loq.llms.setCurrent(value);
          break;
        case "llm_option":
          await loq.llms.current().setCurrentOption(value);
          break;
        case "tts":
          await loq.speechSystems.setCurrent(value);
          break;
        case "tts_option":
          await loq.speechSystems.current().setCurrentOption(value);
          break;
        case "lipsync":
          loq.animators.setCurrent(value);
          break;
        default:
          console.log(`system setting update for ${k} not implemented`);
      }
    }
    res.json(await loq.getSystem());
  });
});


/**
 * Get current system settings.
 */
app.get("/system", async (_req: Request, res: Response) => {
  res.json(await loq.getSystem());
});

/**
 * Front end request for a new session.
 */
app.put("/session", async (_req: Request, res: Response) => {
  await failable(res, "creating new session", async () => {
    await db.finishCurrentSession();
    const session = await db.createSession();
    res.json(session);
  });
});

app.get('/session', async (_req: Request, res: Response) => {
  try {
    res.json(await db.currentSession());
  } catch (e) {
    res.status(404).json({message: "no current session"}).end();
  }
});

app.get('/api/chat', async (_req: Request, res: Response) => {
  await failable(res, "get chat", async () => {
    const session = await db.getOrCreateSession();
    const messages = await db.getMessages(session);
    res.json({
      response: {
        session: session.id,
        messages: messages
      }
    });
  });
});

/**
 * Generic labelled function execution with failure reporting to res and streamServer.
 * On success, the returned promise of fn is returned.
 * @param res response to use for reporting any failure
 * @param name label to use for failure reporting
 * @param fn the function to call
 * @return on success the returned value from fn, on failure, a rejected promise.
 */
const failable = async <T>(res: Response, name: string, fn: () => Promise<T>) => {
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

// POST route to handle GPT request
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const {prompt, portrait} = req.body;
  console.log(`chat request for portrait ${portrait.f} with prompt ${prompt}`);

  if (!prompt) {
    res.status(400).json({error: 'No prompt provided'});
  } else {
    streamServer.workflow("llm_request");
    await failable(res, "loquacious chat", async () => {

      const currentLlm = loq.llms.current();
      const currentSpeech = loq.speechSystems.current();
      const currentAnimator = loq.animators.current();
      let session = await db.getOrCreateSession();
      console.log("storing user message");
      await db.createUserMessage(session, prompt);
      const messageHistory: Message[] = await db.getMessages(session);
      const chatPrepper = loq.modes.getChatPrepper();
      let allMessages = chatPrepper(messageHistory, currentSpeech);
      let llmResponse = await timed("text generation", () => currentLlm.chat(allMessages));

      if (llmResponse.message !== null) {
        streamServer.workflow("llm_response");
        const llmMessage = timed("storing llm response",
            () => db.createCreatorTypeMessage(session, llmResponse.message!, currentLlm));
        const doSpeechSynthesis = async () => {
          streamServer.workflow("tts_request");
          const ssCreator = await db.findCreatorForService(currentSpeech);
          const mimeType = currentSpeech.speechOutputFormat().mimeType;
          const audioFile: AudioFile = await db.createAudioFile(mimeType, ssCreator.id);
          const si = llmMessage.then(m => ({
            getText: () => m.content,
            getBaseFileName: () => `${audioFile.id}`,
          } as SpeechInput));

          const psr = currentSpeech.loqModule().call(si);
          // baby dragon!
          return Promise.resolve(new AsyncSpeechResult(
              () => psr.then(sr => sr.filePath()),
              () => llmMessage.then(m => db.createTts(ssCreator.id, m.id, audioFile.id))
          ));
        };

        await failable(res, "speech generation", async () => {

          const speechResult: SpeechResult = await timed<SpeechResult>("speech synthesis", doSpeechSynthesis);
          streamServer.workflow("tts_response");

          await failable(res, "lipsync generation", async () => {
            const lipsyncCreator = await db.findCreator(currentAnimator.getName(), currentAnimator.getMetadata(), true);
            const mimeType = currentAnimator.videoOutputFormat()?.mimeType;
            if (!mimeType) {
              // hack - better to signal NoLipsync lipsync more explicitly
              return Promise.reject("animator does not declare a Mime Type");
            } else {
              const animateModule = currentAnimator.loqModule();
              animateModule.on("begin", (_) => streamServer.workflow("lipsync_request"));
              animateModule.on("end", (_) => streamServer.workflow("lipsync_response"));

              const lipsyncResult: LipSyncResult = await timed("lipsync animate", async () => {
                const videoFile: VideoFile = await db.createVideoFile(mimeType, lipsyncCreator.id);
                const lsi = speechResult.filePath().then(sf => ({
                  fileKey: `${videoFile.id}`,
                  imageFile: path.join(pathPortrait(), portrait.f).toString(),
                  speechFile: sf
                } as LipSyncInput));

                const animatePromise = animateModule.call(lsi);
                await db.createLipSync(lipsyncCreator.id, (await speechResult.tts())!.id, videoFile.id);
                return await animatePromise;
              });
              res.json(({
                response: {
                  portrait: portrait,
                  // TODO should not use currentSpeech to remove pause commands, the TTS system should be
                  //   attached to the message request as the LLM was instructed at that point
                  messages: (await db.getMessages(session)).map(m => currentSpeech.removePauseCommands(m)),
                  speech: await speechResult.filePath(),
                  lipsync: lipsyncResult,
                  llm: llmResponse.llm,
                  model: llmResponse.model,
                }
              }));
              await currentAnimator.postResponseHook();
            }
          })

        });
      } else {
        res.status(500).json({error: 'No message in response'});
      }
    });
  }
});

/**
 * Endpoint to stream the given audio file.
 */
app.get('/audio', async (req: Request, res: Response) => fileStream(req.query.file!.toString(), res));

/**
 * Endpoint to stream the given video file.
 */
app.get('/video', async (req: Request, res: Response) => fileStream(req.query.file!.toString(), res));


async function initialiseCreatorTypes() {
  const creators: CreatorType[] = [
    ...loq.llms.all(),
    ...loq.speechSystems.systems,
    ...loq.animators.all()
  ];
  console.log(`ensuring ${creators.length} creator types are in database`);
  await Promise.all(creators.map(async creator => {
    console.log(`   initialising ${creator.getName()}`);
    return db.findCreator(creator.getName(), creator.getMetadata(), true);
  }));
}

// Start the server
app.listen(port, async () => {
  // TODO make production implementation that has stored commit hash and uses explicit version metdata
  const hash = await getCurrentCommitHash(process.cwd());
  await db.boot(process.env.DEPLOYMENT_NAME!, hash);
  await initialiseCreatorTypes();

  await timed("prescaling images", () => prescaleImages(`${BASE_PATH_PORTRAIT}`, PORTRAIT_DIMS));
  console.log(`Server is running on port ${port}`);

  const llm = loq.llms.current();
  console.log(`LLM Health check: ${llm.enableHealth ? "enabled" : "disabled"}`);
  console.log(`LLM back end: ${llm.getName()} at URL: ${(llm.baseUrl)}`);
  console.log(`LLM current model: ${await llm.currentModel().then(m => m.id)}`);
  const models = await llm.models();
  console.log(`LLM available models (${models.length}):`);
  models.forEach(m => console.log(`   ${m.id}`));
  console.log(`Current Speech System: ${loq.speechSystems.current().currentOption().descriptor()}`);
  console.log(`Current LipSync: ${loq.animators.current().getName()}`);
});