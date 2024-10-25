import {fileStream, streamFromPath} from "api/mediaStream";
import cors from 'cors';
import dotenv from 'dotenv';
import express, {Request, Response} from 'express';
import {promises as fs} from 'fs';
import {ImageInfo} from "image/ImageInfo";
import {prescaleImages} from "image/imageOps";
import {FakeLipSync} from "lipsync/FakeLipSync";
import {FalSadtalker} from "lipsync/FalSadtalker";
import type {LipSync, LipSyncResult} from "lipsync/LipSync";
import {FakeLlm} from "llm/FakeLlm";
import {LlamaCppLlm} from "llm/LlamaCppLlm";
import {type Llm} from 'llm/Llm';
import {LmStudioLlm} from "llm/LmStudioLlm";
import {OpenAiLlm} from 'llm/OpenAiLlm';
import {supportedImageTypes} from "media";
import {Modes} from "Modes";
import type {Dirent} from "node:fs";
import * as path from 'path';
import type {SpeechResult, SpeechSystem} from "speech/SpeechSystem";
import {SpeechSystems} from "speech/SpeechSystems";
import {ensureDataDirsExist, getCurrentCommitHash} from "system/config";
import {timed} from "system/performance";
import {systemHealth} from "system/SystemStatus";
import Undici, {setGlobalDispatcher} from "undici";
import Db from "./db/Db";
import type {CreatorType} from "./domain/CreatorType";
import type {Message} from "./domain/Message";
import type {Session} from "./domain/Session";
import Agent = Undici.Agent;

// TODO confirm we want connect timeout and not ?"request timeout"
setGlobalDispatcher(new Agent({connect: { timeout: 300_000 }}));

// Load environment variables
dotenv.config();

/** file path relative to server module root */
const BASE_PATH_PORTRAIT = "../public/img";
const PORTRAIT_DIMS = [
  {width: 608, height: 800},
  {width: 1080, height:1920}
];
const dimIndex = 0;
const PATH_PORTRAIT = `../public/img/${PORTRAIT_DIMS[dimIndex].width}x${PORTRAIT_DIMS[dimIndex].height}`;
console.log(`path portrait: ${PATH_PORTRAIT}`)

if (!process.env.DATA_DIR) {
  console.error("ensure environment variable DATA_DIR is set");
}
const PATH_BASE_DATA: string = process.env.DATA_DIR!;

// make sure data subdirectories exist
ensureDataDirsExist(process.env.DATA_DIR!);

const LM_STUDIO_BACKEND: Llm = new LmStudioLlm();
const OPEN_AI_BACKEND: Llm = new OpenAiLlm();
const LLAMA_CPP_BACKEND: Llm = new LlamaCppLlm();

const FAKE_LLM: Llm = new FakeLlm();

const LLMS = [
  LLAMA_CPP_BACKEND,
  OPEN_AI_BACKEND,
  LM_STUDIO_BACKEND,
  FAKE_LLM
]
let llmIndex = 2;

const speechSystems = new SpeechSystems(path.join(PATH_BASE_DATA, "tts"));
const BASEDIR_LIPSYNC = path.join(PATH_BASE_DATA, "lipsync");
const LIPSYNCS: LipSync[] = [
  new FalSadtalker(BASEDIR_LIPSYNC),
  new FakeLipSync(BASEDIR_LIPSYNC)
]
let lipsyncIndex = 0;

const lipSync = LIPSYNCS[lipsyncIndex];

const modes = new Modes();

const db = new Db(10);

const app = express();
const port = process.env.PORT || 3001;


app.use(cors());
app.use(express.json());

app.get("/portraits", async (_req: Request, res: Response) => {
  const exts = supportedImageTypes().flatMap(f => f.extensions).map(f => `.${f}`);
  const allEntries = await fs.readdir(PATH_PORTRAIT, {withFileTypes: true});
  const goodExt = (f: Dirent) => exts.includes(path.extname(f.name).toLowerCase());
  const imgFiles = allEntries.filter(f => f.isFile() && goodExt(f));
  // TODO make ImageInfo relative to web root
  const imageInfos = await Promise.all(imgFiles.map((de: Dirent) => ImageInfo.fromFile(PATH_PORTRAIT, de.name)));
  res.json(imageInfos);
});

app.get("/system", async (_req: Request, res: Response) => {
  const current = speechSystems.current().currentOption();
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
      current: current.safeObject(),
      isFree: speechSystems.current().free()
      // TODO include count of saved speech audio
    },
    lipsync: {
      systems: LIPSYNCS.map(ls => ls.name()),
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
      let session = await getOrCreateSession();

      console.log("storing user message");
      await db.appendUserText(session, prompt);
      const messageHistory: Message[] = await db.getSessionMessages(session);
      const mode = modes.getMode();
      let allMessages = mode(messageHistory, speechSystems.current());
      let llmResponse: string | null = await timed("text generation", async () => {
        const response = await currentLlm.chat(allMessages);
        return response.message
      });

      if (llmResponse) {
        console.log("storing llm response");
        await db.appendText(session, llmResponse, currentLlm);
        try {
          const speechResult: SpeechResult = await timed<SpeechResult>("speech synthesis",
            () => speechSystems.current().speak(llmResponse)
          );
          const speechFilePath = speechResult.filePath();
          if (speechFilePath) {
            const portait = path.join(PATH_PORTRAIT, portrait.f).toString();
            try {
              const lipsyncResult: LipSyncResult = await timed("lipsync", () => {
                return lipSync.lipSync(portait, speechFilePath!)
              });
              // TODO return text history with full session graph for enabling replay etc.
              res.json({
                response: {
                  // portrait instance of ImageInfo, input to lipsync
                  portrait: portrait,
                  // text response from llm as string
                  messages: await db.getSessionMessages(session),
                  // file path to speech audio
                  speech: speechFilePath,
                  // instance of LipSyncResult
                  lipsync: lipsyncResult,
                  // llm that generated the message
                  llm: LLMS[llmIndex].name,
                  // llm model used
                  model: (await LLMS[llmIndex].currentModel()),
                }
              });
              await lipSync.writeCacheFile();
            } catch (e) {
              const msg = "lipsync generation failed";
              console.error(msg, e);
              res.status(500).json({error: msg}).end();
            }
          } else {
            // TODO update front-end to handle missing speech and/or lipsync
            res.json({
              response: {
                // portrait instance of ImageInfo, input to lipsync
                portrait: portrait,
                // text response from llm as string
                messages: await db.getSessionMessages(session),
                // file path to speech audio
                speech: undefined,
                // instance of LipSyncResult
                lipsync: undefined,
                // llm backend that generated the message
                llm: LLMS[llmIndex].name,
                // llm model used
                model: (await LLMS[llmIndex].currentModel()),
              }
            });
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
 * Endpoint to generate and return speech for the given prompt.
 * Not used by main frontend.
 */
app.post('/speak', async (req: Request, res: Response) => {
  const speechResult: SpeechResult = await speechSystems.current().speak(req.body.prompt);
  const filePath = speechResult.filePath();
  if (filePath) {
    streamFromPath(filePath, res);
  } else {
    res.status(404).json({error: 'No audio file'});
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
    ...LIPSYNCS
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