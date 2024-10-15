import cors from 'cors';
import dotenv from 'dotenv';
import express, {Request, Response} from 'express';
import {type BackEnd} from 'llm/BackEnd';
import {LlamaCppBackEnd} from "llm/LlamaCppBackEnd";
import {LmStudioBackEnd} from "llm/LmStudioBackEnd";
import {OpenAiBackEnd} from 'llm/OpenAiBackEnd';
import {MODES} from "Modes";
import {timed} from "performance";
import type {SpeechSystem} from "SpeechSystem";
import {SpeechSystems} from "SpeechSystems";
import {systemHealth} from "SystemStatus";

// Load environment variables
dotenv.config();


const LM_STUDIO_BACKEND: BackEnd = new LmStudioBackEnd();
const OPEN_AI_BACKEND: BackEnd = new OpenAiBackEnd();
const LLAMA_CPP_BACKEND: BackEnd = new LlamaCppBackEnd();

const BACKENDS = [
  LLAMA_CPP_BACKEND,
  OPEN_AI_BACKEND,
  LM_STUDIO_BACKEND,
]

let backendIndex = 2;

const speechSystems = new SpeechSystems();
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
  const current = speechSystems.current();
  res.json({
    mode: {
      current: currentMode,
      options: Object.keys(MODES)
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
        let messages = MODES.invite(prompt["prompt"]);
        const response = await BACKENDS[backendIndex].chat(messages);
        return response.message
      });

      if (message) {
        res.json({
          response: {message},
          backend: BACKENDS[backendIndex].name,
          model: (await BACKENDS[backendIndex].models())[0]
        });
        await timed("speech", () => speechSystems.current().system.speak(message));
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
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Health check ${BACKENDS[backendIndex].enableHealth ? "enabled" : "disabled"}`);
  console.log(`LLM back end ${BACKENDS[backendIndex].name} at URL: ${(BACKENDS[backendIndex].baseUrl)}`);
  console.log(`Current Speech System: ${speechSystems.current().descriptor()}`);
});