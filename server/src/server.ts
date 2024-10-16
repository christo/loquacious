import {addAudioStreamRoute} from "audioStream";
import {ensureDataDirsExist} from "config";
import cors from 'cors';
import dotenv from 'dotenv';
import express, {Request, Response} from 'express';
import {promises as fs} from 'fs';
import {LlamaCppLlm} from "llm/LlamaCppLlm";
import {type Llm} from 'llm/Llm';
import {LmStudioLlm} from "llm/LmStudioLlm";
import {OpenAiLlm} from 'llm/OpenAiLlm';
import {Modes} from "Modes";
import * as path from 'path';
import {timed} from "performance";
import {TYPE_DEFAULT} from "speech/audio";
import {MACOS_SPEECH_SYSTEM_NAME} from "speech/MacOsSpeech";
import type {SpeechSystem} from "speech/SpeechSystem";
import {SpeechSystems} from "speech/SpeechSystems";
import {systemHealth} from "SystemStatus";
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

let backendIndex = 2;

const speechSystems = new SpeechSystems();

const modes = new Modes();

const app = express();
const port = process.env.PORT || 3001;

let currentMode = "invite";

app.use(cors());
app.use(express.json());

// TODO remove this, it's in system
app.get("/health", async (req: Request, res: Response): Promise<void> => {
  res.json(await systemHealth(BACKENDS, backendIndex));
});

app.get("/portraits", async (req: Request, res: Response) => {
  const files = await fs.readdir(PATH_PORTRAIT, {withFileTypes: true});
  res.json(
    files
      .filter(f => f.isFile() && path.extname(f.name).toLowerCase() === '.png')
      .map(x => x.name));
});

app.get("/system", async (req: Request, res: Response) => {
  const current = speechSystems.currentSpeechSystem().currentOption();
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
  const prompt = req.body;

  if (!prompt) {
    res.status(400).json({error: 'No prompt provided'});
  } else {
    try {
      let message: string | null = await timed("text generation", async () => {
        let messages = modes.inviteModeMessages(prompt["prompt"], speechSystems.currentSpeechSystem());
        // console.dir(messages);
        const response = await BACKENDS[backendIndex].chat(messages);
        return response.message
      });

      if (message) {
        res.json({
          response: {message},
          backend: BACKENDS[backendIndex].name,
          model: (await BACKENDS[backendIndex].models())[0]
        });
        await timed("speech", () => speechSystems.currentSpeechSystem().speak(message));
      } else {
        res.status(500).json({error: 'No message in response'});
      }
    } catch (error) {
      console.error('Error fetching response from OpenAI:', error);
      res.status(500);
    }
  }
});

// TODO remove mac hard-coding once all systems generate audio file / or we abstract streamable audio from file
addAudioStreamRoute(app, TYPE_DEFAULT, speechSystems.byName(MACOS_SPEECH_SYSTEM_NAME));

// Start the server
app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);

  const llm = BACKENDS[backendIndex];
  console.log(`LLM Health check: ${llm.enableHealth ? "enabled" : "disabled"}`);
  console.log(`LLM back end: ${llm.name} at URL: ${(llm.baseUrl)}`);
  console.log(`LLM current model: ${await llm.currentModel()}`);
  console.log("LLM available models:");
  (await llm.models()).forEach(m => console.log(`   ${m.id}`));
  console.log(`Current Speech System: ${speechSystems.currentSpeechSystem().currentOption().descriptor()}`);
});