import express, {Request, Response} from "express";
import fs from "fs";
import {formatToMimeType, TYPE_DEFAULT} from "speech/audio";
import type {SpeechSystem} from "speech/SpeechSystem";
import {pipeline} from "stream";

// TODO replace format string with media format abstraction that merges mime types, extensions etc.
function addAudioStreamRoute(app: express.Application, format: string, speechSystem: SpeechSystem) {
  app.post('/speak', async (req: Request, res: Response) => {
    const {prompt} = req.body;
    const audioPath = await speechSystem.speak(prompt);
    console.log(`got audioPath ${audioPath}`);
    res.setHeader('Content-Type', formatToMimeType(TYPE_DEFAULT));
    // TODO verify this is how we should do audio streams
    res.setHeader('Content-Disposition', `attachment; filename="speech.${format}"`);


    try {
      const readStream = fs.createReadStream(audioPath);
      pipeline(readStream, res, (err) => {
        if (err) {
          console.error('Stream pipeline failed:', err);
          res.end();
        }
      });
    } catch (e) {
      console.error('Stream pipeline failed:', e);
      res.end()
    }
  })
}

export {addAudioStreamRoute};
