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
import type {SpeechSystem} from "speech/SpeechSystem";
import {SpeechSystems} from "speech/SpeechSystems";
import {ensureDataDirsExist, getCurrentCommitHash} from "system/config";
import {timed} from "system/performance";
import {systemHealth} from "system/SystemStatus";
import Db from "./db/Db";
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
const OPEN_AI_BACKEND: Llm = new OpenAiLlm("gpt-4o");
const LLAMA_CPP_BACKEND: Llm = new LlamaCppLlm();

const FAKE_LLM: Llm = new FakeLlm();

const LLMS = [
  LLAMA_CPP_BACKEND,
  OPEN_AI_BACKEND,
  LM_STUDIO_BACKEND,
  FAKE_LLM
]
let llmIndex = 1;

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
    },
    speech: {
      systems: speechSystems.systems.map((s: SpeechSystem) => s.display),
      current: current.safeObject(),
      // TODO include count of saved speech audio
    },
    lipsync: {
      systems: LIPSYNCS.map(ls => ls.name()),
      current: lipSync.name(),
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
app.put("/session", async (req: Request, res: Response) => {
  try {
    await db.finishCurrentSession();
    const session = await db.createSession();
    res.json(session);
  } catch (error) {
    console.error('Error creating a new session:', error);
    res.status(500);
  }
});

app.get('/api/chat', async (req: Request, res: Response) => {
  res.json({
    response: {
      messages: [
        {from: "user", text: "Hello I am the user saying something"},
        {from: "system", text: "Hello user, this is system. What do?"},
        {from: "user", text: `Not much, just testing you out. This one has to be really long 
        because I am testing how the overflow works with really long messages. It should ideally
        not extend past half the width of the screen but who knows if that is a good rule of thumb?`},
        {from: "system", text: "All G LMK how I go"},
        {from: "user", text: "Sure thing dog, just chill rn"},
        {from: "system", text: "Chill mode activated"},
      ]
    }
  });
});

// POST route to handle GPT request
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const {prompt, portrait} = req.body;
  console.log(`chat request for portrait ${portrait.f} with prompt ${prompt}`);
  if (!prompt) {
    res.status(400).json({error: 'No prompt provided'});
  } else {
    try {
      let message: string | null = await timed("text generation", async () => {
        let messages = modes.getMode()(prompt, speechSystems.current());
        // console.dir(messages);
        const response = await LLMS[llmIndex].chat(messages);
        return response.message
      });
      const session = await db.currentSession();
      console.log("appending user message");
      await db.appendUserText(session, prompt);

      if (message) {
        // TODO store LLM response


        const speechResult: string = await timed<string>("speech synthesis",
          () => speechSystems.current().speak(message)
        );

        // TODO store response message in session

        const portait = path.join(PATH_PORTRAIT, portrait.f).toString();
        const lipsyncResult: LipSyncResult = await timed("lipsync", () => {
          return lipSync.lipSync(portait, speechResult)
        });
        // TODO return text history here
        //   actually want full session graph for enabling replay etc.
        res.json({
          response: {
            // portrait instance of ImageInfo, input to lipsync
            portrait: portrait,
            // text response from llm as string
            message: message,
            // file path to speech audio
            speech: speechResult,
            // instance of LipSyncResult
            lipsync: lipsyncResult,
            // llm backend that generated the message
            backend: LLMS[llmIndex].name,
            // llm model used
            model: (await LLMS[llmIndex].currentModel()),
          }
        });
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
 */
app.post('/speak', async (req: Request, res: Response) => {
  streamFromPath(await speechSystems.current().speak(req.body.prompt), res);
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
  // TODO make production implementation that has stored commit hash and uses explicit version metdata
  const hash = await getCurrentCommitHash(process.cwd());
  await db.boot(process.env.DEPLOYMENT_NAME!, hash);
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