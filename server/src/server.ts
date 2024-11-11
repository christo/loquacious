import {fileStream} from "api/mediaStream";
import cors from 'cors';
import dotenv from 'dotenv';
import express, {Request, Response} from 'express';
import {promises} from 'fs';
import {ImageInfo} from "image/ImageInfo";
import {prescaleImages} from "image/imageOps";
import type {LipSyncResult} from "lipsync/LipSyncAnimator";
import {Modes} from "llm/Modes";
import {supportedImageTypes} from "media";
import type {Dirent} from "node:fs";
import * as path from 'path';
import type {SpeechResult} from "speech/SpeechSystem";
import {SpeechSystems} from "speech/SpeechSystems";
import {getCurrentCommitHash} from "system/config";
import {timed} from "system/performance";
import {systemHealth} from "system/SystemStatus";
import Undici, {setGlobalDispatcher} from "undici";
import Db from "./db/Db";
import type {AudioFile} from "./domain/AudioFile";
import type {CreatorType} from "./domain/CreatorType";
import {Message} from "./domain/Message";
import {Session} from "./domain/Session";
import type {VideoFile} from "./domain/VideoFile";
import AnimatorServices from "./lipsync/AnimatorServices";
import LlmService from "./llm/LlmService";
import {RunInfo} from "./domain/RunInfo";
import {SystemSummary} from "./domain/SystemSummary";
import {Dimension} from "./image/Dimension";
import {StreamServer} from "./StreamServer";
import Agent = Undici.Agent;


setGlobalDispatcher(new Agent({connect: {timeout: 300_000}}));

// Load environment variables
dotenv.config();

const BASE_WEB_ROOT = "../public"
/** file path relative to server module root */
const BASE_PATH_PORTRAIT = `${BASE_WEB_ROOT}/img`;
const PORTRAIT_DIMS: Dimension[] = [
  {width: 608, height: 800},
  {width: 1080, height: 1920}
];
const dimIndex = 0;
const portraitBaseUrl = () => `/img/${PORTRAIT_DIMS[dimIndex].width}x${PORTRAIT_DIMS[dimIndex].height}`;
const pathPortrait = () => `${BASE_WEB_ROOT}${portraitBaseUrl()}`;
console.log(`path portrait: ${pathPortrait()}`)

if (!process.env.DATA_DIR) {
  console.error("ensure environment variable DATA_DIR is set");
}
const PATH_BASE_DATA: string = process.env.DATA_DIR!;

const llms = new LlmService()
const speechSystems = new SpeechSystems(PATH_BASE_DATA);
const animators = new AnimatorServices(PATH_BASE_DATA);
const modes = new Modes();
const db = new Db( process.env.DB_POOL_SIZE ? parseInt(process.env.DB_POOL_SIZE, 10) : 10);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
const wsPort = parseInt(process.env.WEBSOCKET_PORT || "3002", 10);
const streamServer = new StreamServer(app, wsPort, "http://localhost:5173"); // TODO remove hardcoding

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

app.get("/portrait/:portraitname", async (req: Request, res: Response) => {
  const portraitname = req.params.portraitname;
  // TODO finish implementation using req.sendFile
})

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
          modes.setCurrent(value);
          break;
        case "llm":
          llms.setCurrent(value);
          break;
        case "llm_option":
          await llms.current().setCurrentOption(value);
          break;
        case "tts":
          await speechSystems.setCurrent(value);
          break;
        case "tts_option":
          await speechSystems.current().setCurrentOption(value);
          break;
        case "lipsync":
          animators.setCurrent(value);
          break;
        default:
          console.log(`system setting update for ${k} not implemented`);
      }
    }
    res.json(await getSystem());
  });
});

async function getSystem() {
  const system: SystemSummary = {
    asAt: new Date(),
    mode: {
      current: modes.current(),
      all: modes.allModes()
    },
    llm: {
      // TODO make all others like this
      current: llms.current().getName(),
      all: llms.all().map(llm => llm.getName()),
      options: await llms.current().models(),
      currentOption: await llms.current().currentModel(),
      isFree: llms.current().free()
    },
    tts: {
      current: speechSystems.current().getName(),
      all: speechSystems.systems.map(ss => ss.getName()),
      currentOption: speechSystems.current().currentOption(),
      options: speechSystems.current().options(),
      isFree: speechSystems.current().free(),
    },
    lipsync: {
      all: animators.all().map(ls => ls.getName()),
      current: animators.current().getName(),
      isFree: animators.current().free()
    },
    pose: {
      current: "MediaPipe",
      all: ["MediaPipe", "MoveNet"],
      isFree: true
    },
    vision: {
      current: "Claude 3.5 Sonnet (New)",
      all: ["Claude 3.5 Sonnet (New)", "ChatGPT", "LM-Studio", "llama.cpp", "fal.ai Florence 2 Large"],
      isFree: false,
    },
    stt: {
      current: "whisper.cpp",
      all: ["whisper.cpp", "OpenAI Whisper", "fal.ai something"],
      isFree: true
    },
    runtime: {
      run: new RunInfo(db.getRun())
    },
    health: await systemHealth(llms.current())
  };
  return system;
}

/**
 * Get current system settings.
 */
app.get("/system", async (_req: Request, res: Response) => {
  res.json(await getSystem());
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
})

app.get('/api/chat', async (_req: Request, res: Response) => {
  await failable(res, "get chat", async () => {
    const session = await getOrCreateSession()
    const messages = await db.getSessionMessages(session);
    res.json({
      response: {
        session: session.id,
        messages: messages
      }
    });
  });
});

/**
 * If there's a current session return it, otherwise create one.
 */
async function getOrCreateSession(): Promise<Session> {
  try {
    return await db.currentSession();
  } catch {
    return await db.createSession();
  }
}

const failable = async (res: Response, name: string, thunk: () => Promise<void>) => {
  try {
    return await thunk();
  } catch (e) {
    const msg = `${name} failed`;
    console.error(msg, e);
    res.status(500).json({error: msg}).end();
  }
}

// POST route to handle GPT request
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const {prompt, portrait} = req.body;
  console.log(`chat request for portrait ${portrait.f} with prompt ${prompt}`);

  if (!prompt) {
    res.status(400).json({error: 'No prompt provided'});
  } else {
    streamServer.workflow("llm_request");
    await failable(res, "loquacious chat", async () => {
      const currentLlm = llms.current();
      const currentModel = await currentLlm.currentModel()
      const currentSpeech = speechSystems.current();
      const currentAnimator = animators.current();
      const buildResponse = (messages: Message[], speechFilePath?: string, lipsyncResult?: LipSyncResult) => ({
        response: {
          portrait: portrait,
          messages: messages,
          speech: speechFilePath,
          lipsync: lipsyncResult,
          llm: currentLlm.getName(),
          model: currentModel,
        }
      });
      let session = await getOrCreateSession();
      console.log("storing user message");
      await db.createUserMessage(session, prompt);
      const messageHistory: Message[] = await db.getSessionMessages(session);
      const mode = modes.getChatPrepper();
      let allMessages = mode(messageHistory, currentSpeech);
      let llmResponse: string | null = await timed("text generation", async () => {
        const response = await currentLlm.chat(allMessages);
        return response.message
      });

      if (llmResponse) {
        streamServer.workflow("llm_response");
        // this nested chain of calls needs to be a pre-wired modular production line
        const llmMessage = await timed("storing llm response",
            () => db.createCreatorTypeMessage(session, llmResponse, currentLlm));

        await failable(res, "speech generation", async () => {
          const speechResult: SpeechResult = await timed<SpeechResult>("speech synthesis",
              async () => {
                streamServer.workflow("tts_request");
                const ssCreator = await db.findCreator(currentSpeech.getName(), currentSpeech.getMetadata(), true);
                const mimeType = currentSpeech.outputFormat().mimeType;
                const audioFile: AudioFile = await db.createAudioFile(mimeType, ssCreator.id);
                const sr = await currentSpeech.speak(llmMessage.content, `${audioFile.id}`);
                const tts = await db.createTts(ssCreator.id, llmMessage.id, audioFile.id);
                return {...sr, tts: () => tts} as SpeechResult;
              }
          );
          const speechFilePath = speechResult.filePath();
          if (speechFilePath) {
            streamServer.workflow("tts_response");
            const portait = path.join(pathPortrait(), portrait.f).toString();
            await failable(res, "lipsync generation", async () => {
              const lipsyncCreator = await db.findCreator(currentAnimator.getName(), currentAnimator.getMetadata(), true);
              const mimeType = currentAnimator.outputFormat()?.mimeType;
              if (!mimeType) {
                // this is a hack - how to signal NoLipsync lipsync animation?
                return Promise.reject("animator does not declare a Mime Type");
              } else {
                const videoFile: VideoFile = await db.createVideoFile(mimeType, lipsyncCreator.id);
                const lipsyncResult: LipSyncResult = await timed("lipsync animate", async () => {
                  const lipsync = await db.createLipSync(lipsyncCreator.id, speechResult.tts()!.id, videoFile.id);
                  console.log(`lipsync db id: ${lipsync.id}`);
                  streamServer.workflow("lipsync_request");
                  return currentAnimator.animate(portait, speechFilePath!, `${videoFile.id}`);
                });
                streamServer.workflow("lipsync_response");
                // TODO return full session graph for enabling replay etc.
                const finalMessages = (await db.getSessionMessages(session)).map(m => currentSpeech.removePauseCommands(m));
                res.json(buildResponse(finalMessages, speechFilePath, lipsyncResult));
                await currentAnimator.writeCacheFile();
              }
            })
          } else {
            res.json(buildResponse(await db.getSessionMessages(session), undefined, undefined));
          }
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
    ...llms.all(),
    ...speechSystems.systems,
    ...animators.all()
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

  const llm = llms.current();
  console.log(`LLM Health check: ${llm.enableHealth ? "enabled" : "disabled"}`);
  console.log(`LLM back end: ${llm.getName()} at URL: ${(llm.baseUrl)}`);
  console.log(`LLM current model: ${await llm.currentModel()}`);
  const models = await llm.models();
  console.log(`LLM available models (${models.length}):`);
  models.forEach(m => console.log(`   ${m.id}`));
  console.log(`Current Speech System: ${speechSystems.current().currentOption().descriptor()}`);
  console.log(`Current LipSync: ${animators.current().getName()}`);
});