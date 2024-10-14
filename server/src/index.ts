import cors from 'cors';
import dotenv from 'dotenv';
import express, {Request, Response} from 'express';
import {readFileSync} from "fs";
import {OpenAI} from 'openai';
import {type BackEnd, OpenAi} from 'BackEnd';
import type {SpeechSystem} from "SpeechSystem";
import {SpeechSystems} from "SpeechSystems";

// Load environment variables
dotenv.config();


// const BACKEND: BackEnd = new LmStudio();
// const BACKEND: BackEnd = new LlamaCpp();
const BACKEND: BackEnd = new OpenAi();

const speechSystems = new SpeechSystems();

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
  const current = speechSystems.current();
  res.json({
    ttsResponse: {
      name: BACKEND.name,
      models: await BACKEND.models(),
    },
    speech: {
      systems: speechSystems.systems.map((s: SpeechSystem) => s.display),
      current: current.safeObject(),
    }
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
        speechSystems.current().system.speak(message).then((speech) => {
          console.log("finished speaking");
        });

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
  console.log(`Current Speech System: ${speechSystems.current().descriptor()}`);
});