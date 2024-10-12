import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import {Request, Response} from 'express';
import {readFileSync} from "fs";
import {OpenAI} from 'openai';
import {Voice} from './Voice';

// Load environment variables
dotenv.config();

const ENABLE_HEALTH=true;

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize OpenAI with the API key
const openai = new OpenAI({
  baseURL: "http://localhost:8080",
  apiKey: process.env.OPENAI_API_KEY as string,
});

const voice = new Voice();

const systemPrompt: string = readFileSync("prompts/fortune-system-prompt.txt").toString();

// Health check route
app.get("/health", async (req: Request, res: Response): Promise<void> => {
  if (!ENABLE_HEALTH) {
    res.send(JSON.stringify({message: "ok"}));
  } else {
    try {
      const r = await fetch("http://localhost:8080/health", {});
      const healthStatus = await r.json();
      res.send(healthStatus);
    } catch (error) {
      // TODO how to catch a TCP connection failure
      res.status(500).send({error: 'Health check failed'});
    }
  }
});

// POST route to handle GPT request
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const prompt = req.body;

  if (!prompt) {
    res.status(400).json({error: 'No prompt provided'});
  } else {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {role: 'system', content: systemPrompt},
          {role: 'user', content: prompt["prompt"]}
        ]
      });

      const message: string | null = response.choices[0].message?.content;

      if (message) {
        res.json({response: {message}});
        await voice.speak(message);
      } else {
        res.status(500).json({error: 'No message in response'});
      }
    } catch (error) {
      console.error('Error fetching response from OpenAI:', error);
      res.status(500).json({error: 'Failed to fetch response from GPT'});
    }
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});