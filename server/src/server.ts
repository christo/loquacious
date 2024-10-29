import {fileStream} from "api/mediaStream";
import cors from 'cors';
import dotenv from 'dotenv';
import express, {Request, Response} from 'express';
import {promises} from 'fs';
import {ImageInfo} from "image/ImageInfo";
import {prescaleImages} from "image/imageOps";
import {FakeLipSync} from "lipsync/FakeLipSync";
import {FalSadtalker} from "lipsync/FalSadtalker";
import type {LipSyncAnimator, LipSyncResult} from "lipsync/LipSyncAnimator";
import {FakeLlm} from "llm/FakeLlm";
import {LlamaCppLlm} from "llm/LlamaCppLlm";
import {LmStudioLlm} from "llm/LmStudioLlm";
import {Modes} from "llm/Modes";
import {OpenAiLlm} from 'llm/OpenAiLlm';
import {supportedImageTypes} from "media";
import type {Dirent} from "node:fs";
import * as path from 'path';
import type {SpeechResult, SpeechSystem} from "speech/SpeechSystem";
import {SpeechSystems} from "speech/SpeechSystems";
import {ensureDataDirsExist, getCurrentCommitHash} from "system/config";
import {timed} from "system/performance";
import {systemHealth} from "system/SystemStatus";
import Undici, {setGlobalDispatcher} from "undici";
import Db from "./db/Db";
import type {AudioFile} from "./domain/AudioFile";
import type {CreatorType} from "./domain/CreatorType";
import {Message} from "./domain/Message";
import {Session} from "./domain/Session";
import type {VideoFile} from "./domain/VideoFile";
import Agent = Undici.Agent;

// TODO confirm we want connect timeout and not ?"request timeout"
setGlobalDispatcher(new Agent({connect: {timeout: 300_000}}));

// Load environment variables
dotenv.config();

/** file path relative to server module root */
const BASE_PATH_PORTRAIT = "../public/img";
const PORTRAIT_DIMS = [
  {width: 608, height: 800},
  {width: 1080, height: 1920}
];
const dimIndex = 0;
const PATH_PORTRAIT = `../public/img/${PORTRAIT_DIMS[dimIndex].width}x${PORTRAIT_DIMS[dimIndex].height}`;
console.log(`path portrait: ${PATH_PORTRAIT}`)

if (!process.env.DATA_DIR) {
  console.error("ensure environment variable DATA_DIR is set");
}
const PATH_BASE_DATA: string = process.env.DATA_DIR!;

ensureDataDirsExist(process.env.DATA_DIR!);

const LLMS = [
  new OpenAiLlm(),
  new LlamaCppLlm(),
  new LmStudioLlm(),
  new FakeLlm()
].filter(s => s.canRun())
let llmIndex = 0;

const speechSystems = new SpeechSystems(path.join(PATH_BASE_DATA, "tts"));
const BASEDIR_LIPSYNC = path.join(PATH_BASE_DATA, "lipsync");
const ANIMATORS: LipSyncAnimator[] = [
  new FalSadtalker(BASEDIR_LIPSYNC),
  new FakeLipSync(BASEDIR_LIPSYNC)
].filter(s => s.canRun())
let lipsyncIndex = 0;

const lipSync = ANIMATORS[lipsyncIndex];

const modes = new Modes();

const db = new Db(10);

const app = express();
const port = process.env.PORT || 3001;


app.use(cors());
app.use(express.json());

app.get("/portraits", async (_req: Request, res: Response) => {
  const exts = supportedImageTypes().flatMap(f => f.extensions).map(f => `.${f}`);
  const allEntries = await promises.readdir(PATH_PORTRAIT, {withFileTypes: true});
  const goodExt = (f: Dirent) => exts.includes(path.extname(f.name).toLowerCase());
  const imgFiles = allEntries.filter(f => f.isFile() && goodExt(f));
  const imageInfos = await Promise.all(imgFiles.map((de: Dirent) => ImageInfo.fromFile(PATH_PORTRAIT, de.name)));
  res.json(imageInfos);
});

app.get("/system", async (_req: Request, res: Response) => {
  res.json({
    mode: {
      current: modes.current(),
      options: modes.allModes()
    },
    llmMain: {
      name: LLMS[llmIndex].name,
      models: await LLMS[llmIndex].models(),
      currentModel: await LLMS[llmIndex].currentModel(),
      isFree: LLMS[llmIndex].free()
    },
    speech: {
      systems: speechSystems.systems.map((s: SpeechSystem) => s.display),
      current: speechSystems.current().currentOption().safeObject(),
      isFree: speechSystems.current().free()
    },
    lipsync: {
      systems: ANIMATORS.map(ls => ls.name()),
      current: lipSync.name(),
      isFree: lipSync.free()
    },
    runtime: {
      run: db.getRun()
    },
    health: await systemHealth(LLMS, llmIndex)
  });
});

/**
 * Front end request for a new session.
 */
app.put("/session", async (_req: Request, res: Response) => {
  try {
    await db.finishCurrentSession();
    const session = await db.createSession();
    res.json(session);
  } catch (error) {
    console.error('Error creating a new session:', error);
    res.status(500).end();
  }
});

app.get('/session', async (_req: Request, res: Response) => {
  try {
    res.json(await db.currentSession());
  } catch (e) {
    res.status(404).json({message: "no current session"}).end();
  }
})

app.get('/api/chat', async (_req: Request, res: Response) => {
  try {
    const session = await getOrCreateSession()
    const messages = await db.getSessionMessages(session);
    res.json({
      response: {
        session: session.id,
        messages: messages
      }
    });
  } catch (e) {
    res.status(500).end();
  }
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

// POST route to handle GPT request
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const {prompt, portrait} = req.body;
  console.log(`chat request for portrait ${portrait.f} with prompt ${prompt}`);
  if (!prompt) {
    res.status(400).json({error: 'No prompt provided'});
  } else {
    try {
      const currentLlm = LLMS[llmIndex];
      const currentModel = await currentLlm.currentModel()
      const buildResponse = (messages: Message[], speechFilePath?: string, lipsyncResult?: LipSyncResult) => ({
        response: {
          portrait: portrait,
          messages: messages,
          speech: speechFilePath,
          lipsync: lipsyncResult,
          llm: currentLlm.name,
          model: currentModel,
        }
      });
      let session = await getOrCreateSession();
      console.log("storing user message");
      await db.createUserMessage(session, prompt);
      const messageHistory: Message[] = await db.getSessionMessages(session);
      const mode = modes.getMode();
      const currentSpeechSystem = speechSystems.current();
      let allMessages = mode(messageHistory, currentSpeechSystem);
      let llmResponse: string | null = await timed("text generation", async () => {
        const response = await currentLlm.chat(allMessages);
        return response.message
      });

      if (llmResponse) {
        const llmMessage = await timed(
          "storing llm response",
          () => db.createCreatorTypeMessage(session, llmResponse, currentLlm));
        try {
          const speechResult: SpeechResult = await timed<SpeechResult>(
            "speech synthesis",
            async () => {
              const ssCreator = await db.findCreator(currentSpeechSystem.getName(), currentSpeechSystem.getMetadata(), true);
              const mimeType = currentSpeechSystem.outputFormat().mimeType;
              const audioFile: AudioFile = await db.createAudioFile(mimeType, ssCreator.id);
              const sr = await currentSpeechSystem.speak(llmMessage.content, `${audioFile.id}`);

              const tts = await db.createTts(ssCreator.id, llmMessage.id, audioFile.id);
              return {...sr, tts: () => tts} as SpeechResult;
            }
          );

          const speechFilePath = speechResult.filePath();
          if (speechFilePath) {
            const portait = path.join(PATH_PORTRAIT, portrait.f).toString();
            try {
              const lipsyncCreator = await db.findCreator(lipSync.getName(), lipSync.getMetadata(), true);
              const mimeType = lipSync.outputFormat().mimeType;
              const videoFile: VideoFile = await db.createVideoFile(mimeType, lipsyncCreator.id);

              const lipsyncResult: LipSyncResult = await timed("lipsync animate", async () => {
                const lipsync = await db.createLipSync(lipsyncCreator.id, speechResult.tts()!.id, videoFile.id);
                console.log(`created lipsync id ${lipsync.id}`);
                return lipSync.animate(portait, speechFilePath!, `${videoFile.id}`);
              });

              // TODO return full session graph for enabling replay etc.
              const finalMessages = (await db.getSessionMessages(session)).map(m => currentSpeechSystem.removePauseCommands(m));
              res.json(buildResponse(finalMessages, speechFilePath, lipsyncResult));

              await lipSync.writeCacheFile();
            } catch (e) {
              const msg = "lipsync generation failed";
              console.error(msg, e);
              res.status(500).json({error: msg}).end();
            }
          } else {
            res.json(buildResponse(await db.getSessionMessages(session), undefined, undefined));
          }
        } catch (e) {
          const msg = "speech generation failed";
          console.error(msg, e);
          res.status(500).json({error: msg}).end();
        }
      } else {
        res.status(500).json({error: 'No message in response'});
      }
    } catch (error) {
      console.error('Error performing loquacious chat:', error);
      res.status(500);
    }
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
    ...LLMS,
    ...speechSystems.systems,
    ...ANIMATORS
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
  // TODO remove host hard-coding
  console.log(`Server is running on http://localhost:${port}`);

  const llm = LLMS[llmIndex];
  console.log(`LLM Health check: ${llm.enableHealth ? "enabled" : "disabled"}`);
  console.log(`LLM back end: ${llm.name} at URL: ${(llm.baseUrl)}`);
  console.log(`LLM current model: ${await llm.currentModel()}`);
  const models = await llm.models();
  console.log(`LLM available models (${models.length}):`);
  models.forEach(m => console.log(`   ${m.id}`));
  console.log(`Current Speech System: ${speechSystems.current().currentOption().descriptor()}`);
  console.log(`Current LipSync: ${lipSync.name()}`);
});