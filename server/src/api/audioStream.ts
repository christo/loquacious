import express, {Request, Response} from "express";
import fs from "fs";
import path from "path";
import {formatToMimeType, TYPE_DEFAULT} from "media";
import type {SpeechSystem} from "speech/SpeechSystem";
import {pipeline} from "stream";

function streamFromPath(audioPath: string, res: Response) {
  const readStream = fs.createReadStream(audioPath);
  res.setHeader('Content-Type', formatToMimeType(TYPE_DEFAULT));
  const ppp = audioPath.split(path.sep);
  // TODO verify this is how we should do audio streams
  res.setHeader('Content-Disposition', `attachment; filename="${ppp[ppp.length - 1]}"`);
  pipeline(readStream, res, (err) => {
    if (err && err.code === "ENOENT") {
      res.status(404).json({message: "NOT OFOUNDO"}).end();
    } else if (err) {
      console.log('Stream pipeline failed:', err);
      res.status(500).end();
    }
  });
}

// TODO replace format string with media format abstraction that merges mime types, extensions etc.
function addAudioStreamRoutes(app: express.Application, speechSystem: SpeechSystem) {
  app.post('/speak', async (req: Request, res: Response) => {
    const {prompt} = req.body;
    const audioPath = await speechSystem.speak(prompt);
    console.log(`got audioPath ${audioPath}`);

    streamFromPath(audioPath, res);
  });

  app.get('/audio', async (req: Request, res: Response) => {
    // TODO move to path param like /audio/:audioFile
    const audioFile = req.query.file?.toString();
    console.log(`got request for audioFile ${audioFile}`);
    if (!audioFile) {
      res.status(404).json({message: "NOT OFOUNDO"});
    } else {
      streamFromPath(audioFile, res);
    }
  });
}

export {addAudioStreamRoutes};
