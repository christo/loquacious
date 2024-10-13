import cors from 'cors';
import dotenv from 'dotenv';
import type {Voice} from "Voice";
import {ElevenLabsVoice} from "./ElevenLabsVoice";
import express, {Request, Response} from 'express';
import {readFileSync} from "fs";
import {OpenAI} from 'openai';
import {SystemVoice} from './SystemVoice';
import {type BackEnd, LmStudio, LlamaCpp, OpenAi} from './BackEnd';

// Load environment variables
dotenv.config();


// const BACKEND: BackEnd = new LmStudio();
// const BACKEND: BackEnd = new LlamaCpp();
const BACKEND: BackEnd = new OpenAi();
let SPEECH_ENABLED = true;

// const voice = new ElevenLabsVoice();
const voice = new SystemVoice();

let voiceIndex = 0;
const VOICES = [
  new SystemVoice(),
  new ElevenLabsVoice()
]

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize OpenAI with the API key
const openai = new OpenAI({
  baseURL: BACKEND.baseUrl,
  apiKey: process.env.OPENAI_API_KEY as string,
});



const systemPrompt: string = readFileSync("prompts/fortune-system-prompt.txt").toString();

// Health check route
app.get("/health", async (req: Request, res: Response): Promise<void> => {
  if (!BACKEND.enableHealth) {
    res.send(JSON.stringify({message: "health disabled"}));
  } else {
    try {
      const r = await fetch(`${(BACKEND.baseUrl)}/health`, {});
      const healthStatus = await r.json();
      res.send(healthStatus);
    } catch (error) {
      res.status(500).send({error: 'Health check failed'});
    }
  }
});

app.get("/settings", async (req: Request, res: Response) => {
  res.json({
    backend: {
      name: BACKEND.name,
      models: await BACKEND.models(),
    },
    speechEnabled: SPEECH_ENABLED,
    voice: {
      name: VOICES[voiceIndex].name,
      voices: VOICES.map((voice: Voice) => voice.name)
    },
  });
})

// POST route to handle GPT request
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const prompt = req.body;

  if (!prompt) {
    res.status(400).json({error: 'No prompt provided'});
  } else {
    try {
      console.log("starting text generation");
      let start = new Date();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {role: 'system', content: systemPrompt},
          {role: 'user', content: prompt["prompt"]}
        ]
      });
      console.log(`text generation finished in ${new Date().getTime() - start.getTime()} ms`);
      const message: string | null = response.choices[0]?.message?.content;

      if (message) {
        res.json({response: {message}, backend: BACKEND, model: "todo"});
        if (SPEECH_ENABLED) {
          await VOICES[voiceIndex].speak(message);
        }
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
  console.log(`Health check ${BACKEND.enableHealth ? "enabled" : "disabled"}`);
  console.log(`LLM back end ${BACKEND.name} at URL: ${(BACKEND.baseUrl)}`);
  console.log(`Voice: ${voice.name}`);
});