import cors from 'cors';
import dotenv from 'dotenv';
import express, {Request, Response} from 'express';
import {FakeLlm} from "FakeLlm";
import {promises as fs} from 'fs';
import {prescaleImages} from "image/imageOps";
import {FakeLipSync} from "lipsync/FakeLipSync";
import type {LipSync} from "lipsync/LipSync";
import {supportedImageTypes} from "media";
import type {Dirent} from "node:fs";
import * as path from 'path';
import {addAudioStreamRoutes, addVideoStreamRoutes} from "./api/mediaStream";
import {ImageInfo} from "./image/ImageInfo";
import {FalSadtalker} from "./lipsync/FalSadtalker";
import {LlamaCppLlm} from "./llm/LlamaCppLlm";
import {type Llm} from './llm/Llm';
import {LmStudioLlm} from "./llm/LmStudioLlm";
import {OpenAiLlm} from './llm/OpenAiLlm';
import {Modes} from "./Modes";
import type {SpeechSystem} from "./speech/SpeechSystem";
import {SpeechSystems} from "./speech/SpeechSystems";
import {ensureDataDirsExist} from "./system/config";
import {timed} from "./system/performance";
import {systemHealth} from "./system/SystemStatus";
// Load environment variables
dotenv.config();

/** file path relative to server module root */
const BASE_PATH_PORTRAIT = "../public/img";
const PORTRAIT_SCALE_DIMENSIONS = [
  {width: 600, height: 800},
  {width: 1080, height:1920}
];
const currentDimensionIndex = 0;
const PATH_PORTRAIT = `../public/img/${PORTRAIT_SCALE_DIMENSIONS[currentDimensionIndex].width}x${PORTRAIT_SCALE_DIMENSIONS[currentDimensionIndex].height}`;
console.log(`path portrait: ${PATH_PORTRAIT}`)

const PATH_BASE_DATA: string = process.env.DATA_DIR!;
if (!PATH_BASE_DATA) {
  console.error("ensure environment variable DATA_DIR is set");
}

// make sure data subdirectories exist
ensureDataDirsExist(process.env.DATA_DIR!);

const LM_STUDIO_BACKEND: Llm = new LmStudioLlm();
const OPEN_AI_BACKEND: Llm = new OpenAiLlm();
const LLAMA_CPP_BACKEND: Llm = new LlamaCppLlm();

const FAKE_LLM: Llm = new FakeLlm();

const BACKENDS = [
  LLAMA_CPP_BACKEND,
  OPEN_AI_BACKEND,
  LM_STUDIO_BACKEND,
  FAKE_LLM
]
let backendIndex = 1;

const speechSystems = new SpeechSystems();
const BASEDIR_LIPSYNC = path.join(PATH_BASE_DATA, "lipsync");
const LIPSYNCS: LipSync[] = [
  new FalSadtalker(BASEDIR_LIPSYNC.toString()),
  new FakeLipSync(BASEDIR_LIPSYNC)
]
let lipsyncIndex = 0;

const lipSync = LIPSYNCS[lipsyncIndex];

const modes = new Modes();

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
      name: BACKENDS[backendIndex].name,
      models: await BACKENDS[backendIndex].models(),
    },
    speech: {
      systems: speechSystems.systems.map((s: SpeechSystem) => s.display),
      current: current.safeObject(),
      // TODO include filecount of saved speech audio
    },
    lipsync: {
      systems: LIPSYNCS.map(ls => ls.name()),
      current: lipSync.name(),
    },
    health: await systemHealth(BACKENDS, backendIndex)
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

        console.log("thePrompt:", prompt);
        let messages = modes.getMode()(prompt, speechSystems.current());
        // console.dir(messages);
        const response = await BACKENDS[backendIndex].chat(messages);
        return response.message
      });

      if (message) {
        const speechResult = await timed<string>(
          "speech generation",
          () => speechSystems.current().speak(message)
        );

        const portait = path.join(PATH_PORTRAIT, portrait.f).toString();
        const lipsyncResult = await timed("lipsync", () => {
          return lipSync.lipSync(portait, speechResult)
        });

        res.json({
          response: {
            message: message,
            speech: speechResult,
            lipsync: lipsyncResult,
            backend: BACKENDS[backendIndex].name,
            model: (await BACKENDS[backendIndex].models())[0],
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

addAudioStreamRoutes(app, speechSystems.current());
addVideoStreamRoutes(app);

// Start the server
app.listen(port, async () => {
  await timed("prescaling images", () => prescaleImages(`${BASE_PATH_PORTRAIT}`, PORTRAIT_SCALE_DIMENSIONS));
  // TODO remove host hard-coding
  console.log(`Server is running on http://localhost:${port}`);

  const llm = BACKENDS[backendIndex];
  console.log(`LLM Health check: ${llm.enableHealth ? "enabled" : "disabled"}`);
  console.log(`LLM back end: ${llm.name} at URL: ${(llm.baseUrl)}`);
  console.log(`LLM current model: ${await llm.currentModel()}`);
  console.log("LLM available models:");
  (await llm.models()).forEach(m => console.log(`   ${m.id}`));
  console.log(`Current Speech System: ${speechSystems.current().currentOption().descriptor()}`);
  console.log(`Current LipSync: ${lipSync.name()}`);
});