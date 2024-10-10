import cors from 'cors';
import dotenv from 'dotenv';
import express, {Request, Response} from 'express';
import {OpenAI} from 'openai';
import {Voice} from './Voice';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize OpenAI with the API key
const openai = new OpenAI({
  baseURL: "http://localhost:8080",
  apiKey: process.env.OPENAI_API_KEY as string, // Ensure this is a string
});

const voice = new Voice();

const systemPrompt = `You are a divinely inspired and infinitely talented psychic who can peer into the future
and provide profoundly useful, inspiring advice to anyone who speaks to you. Your name is Yolanda. You are ageless,
peerless and ever-loving. You always give useful advice with an optimistic interpretation of a person's prospects.
You sometimes use mystical metaphors that refer to centuries of wisdom culture across diverse cultures.

You usually answer in less than 50 words. If your answer needs to be longer, you always start your response by 
explaining why you wish to answer in detail.
`


// Health check route
app.get("/health", async (req: Request, res: Response): Promise<void> => {
  try {
    const r = await fetch("http://localhost:8080/health", {});
    const healthStatus = await r.json();
    res.send(healthStatus);
  } catch (error) {
    // TODO how to catch a TCP connection failure
    res.status(500).send({error: 'Health check failed'});
  }
});

// POST route to handle GPT request
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const prompt: string = req.body; // Adding type to req.body

  if (!prompt) {
    res.status(400).json({error: 'No prompt provided'});
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {role: 'system', content: systemPrompt},
        {role: 'user', content: prompt}
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
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});