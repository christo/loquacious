import cors from 'cors';
import dotenv from 'dotenv';
import express, {Request, Response} from 'express';
import {type Llm} from 'llm/Llm';
import {LlamaCppLlm} from "llm/LlamaCppLlm";
import {LmStudioLlm} from "llm/LmStudioLlm";
import {OpenAiLlm} from 'llm/OpenAiLlm';
import {Modes} from "Modes";
import {timed} from "performance";
import type {SpeechSystem} from "speech/SpeechSystem";
import {SpeechSystems} from "speech/SpeechSystems";
import {systemHealth} from "SystemStatus";

// Load environment variables
dotenv.config();


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

// Health check route
app.get("/health", async (req: Request, res: Response): Promise<void> => {
  res.send(JSON.stringify(await systemHealth(BACKENDS, backendIndex)));
});

app.get("/settings", async (req: Request, res: Response) => {
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
    }
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