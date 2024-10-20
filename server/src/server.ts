import {addVideoStreamRoutes, addAudioStreamRoutes} from "api/mediaStream";
import {ensureDataDirsExist} from "system/config";
import cors from 'cors';
import dotenv from 'dotenv';
import express, {Request, Response} from 'express';
import {FalSadtalker} from "lipsync/FalSadtalker";
import {promises as fs} from 'fs';
import {ImageInfo} from "image/ImageInfo";
import {LlamaCppLlm} from "llm/LlamaCppLlm";
import {type Llm} from 'llm/Llm';
import {LmStudioLlm} from "llm/LmStudioLlm";
import {OpenAiLlm} from 'llm/OpenAiLlm';
import {Modes} from "Modes";
import * as path from 'path';
import {timed} from "system/performance";
import type {SpeechSystem} from "speech/SpeechSystem";
import {SpeechSystems} from "speech/SpeechSystems";
import {systemHealth} from "system/SystemStatus";
// Load environment variables
dotenv.config();

/** relative to server module root */
const PATH_PORTRAIT = "../public/img";

const PATH_BASE_DATA: string = process.env.DATA_DIR!;
if (!PATH_BASE_DATA) {
  console.error("ensure environment variable DATA_DIR is set");
}

// make sure data subdirectories exist
ensureDataDirsExist(process.env.DATA_DIR!);

const LM_STUDIO_BACKEND: Llm = new LmStudioLlm();
const OPEN_AI_BACKEND: Llm = new OpenAiLlm();
const LLAMA_CPP_BACKEND: Llm = new LlamaCppLlm();

const BACKENDS = [
  LLAMA_CPP_BACKEND,
  OPEN_AI_BACKEND,
  LM_STUDIO_BACKEND,
]

let backendIndex = 1;

const speechSystems = new SpeechSystems();
const lipSync = new FalSadtalker(path.join(PATH_BASE_DATA, "lipsync").toString());
const modes = new Modes();

const app = express();
const port = process.env.PORT || 3001;

let currentMode = "invite";

app.use(cors());
app.use(express.json());

app.get("/portraits", async (req: Request, res: Response) => {
  const extensions = ['.png', '.gif', '.jpg', '.jpeg'];
  const files = (await fs.readdir(PATH_PORTRAIT, {withFileTypes: true}))
    .filter(f => f.isFile() && extensions.includes(path.extname(f.name).toLowerCase()))
    .map(x => x.name);
  const imageInfos = [];
  for (let file of files) {
    imageInfos.push(await ImageInfo.fromFile(PATH_PORTRAIT, file));
  }
  res.json(imageInfos);
});

app.get("/system", async (req: Request, res: Response) => {
  const current = speechSystems.current().currentOption();
  res.json({
    mode: {
      current: currentMode,
      options: ["invite", "chat"]
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
    health: await systemHealth(BACKENDS, backendIndex)
  });
});


// POST route to handle GPT request
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const {prompt, portrait} = req.body;
  console.log(`chat request for portrait ${portrait.f}`);
  if (!prompt) {
    res.status(400).json({error: 'No prompt provided'});
  } else {
    try {
      let message: string | null = await timed("text generation", async () => {
        let messages = modes.chatModeMessages(prompt["prompt"], speechSystems.current());
        // console.dir(messages);
        const response = await BACKENDS[backendIndex].chat(messages);
        return response.message
      });

      if (message) {
        const speechResult = await timed("speech generation", () => speechSystems.current().speak(message));

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
  console.log(`Server is running on http://localhost:${port}`);

  const llm = BACKENDS[backendIndex];
  console.log(`LLM Health check: ${llm.enableHealth ? "enabled" : "disabled"}`);
  console.log(`LLM back end: ${llm.name} at URL: ${(llm.baseUrl)}`);
  console.log(`LLM current model: ${await llm.currentModel()}`);
  console.log("LLM available models:");
  (await llm.models()).forEach(m => console.log(`   ${m.id}`));
  console.log(`Current Speech System: ${speechSystems.current().currentOption().descriptor()}`);
});