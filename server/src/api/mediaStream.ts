import express, {Request, Response} from "express";
import fs from "fs";
import type {LipSync} from "LipSync";
import {extToFormat, formatToMimeType, mimeTypeToFormat, TYPE_DEFAULT} from "media";
import path from "path";
import type {SpeechSystem} from "speech/SpeechSystem";
import {pipeline} from "stream";

/** @deprecated use streamFromPath() */
// @ts-ignore
// noinspection JSUnusedLocalSymbols
function streamFromPathDelete(audioPath: string, res: Response) {
  // noinspection DuplicatedCode
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

function die(res: Response, message: string, code=500, err?: any) {
  if (err) {
    console.error(message, err);
  } else {
    console.error(message);
  }
  res.status(code).end();
}


/**
 * Return media file at path to response appropriate for being fetched by client code.
 * @param filePath relative path to audio or video media file
 * @param res response
 */
function streamFromPath(filePath: string, res: Response) {
  const readStream = fs.createReadStream(filePath);
  const format = extToFormat(filePath);
  if (!format) {
    die(res, `Unknown MimeType for ${filePath}`);
  } else {
    const mimeType = format.mimeType;
    res.setHeader('Content-Type', mimeType);
    const pathParts = filePath.split(path.sep);
    res.setHeader('Content-Disposition', `attachment; filename="${pathParts[pathParts.length - 1]}"`);
    console.log(`attempting to send ${format.modality} file for path ${filePath}`);
    pipeline(readStream, res, (err) => {
      if (err && err.code === "ENOENT") {
        die(res, "file not found", 404);
      } else if (err) {
        die(res, 'Stream pipeline failed', 500, err);
      }
    });
  }
}

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


function addVideoStreamRoutes(app: express.Application, lipSync: LipSync) {
  app.get('/video', async (req: Request, res: Response) => {
    // TODO move to path param like /video/:videoFile
    const videoFile = req.query.file?.toString();
    console.log(`got request for videoFile ${videoFile}`);
    if (!videoFile) {
      res.status(404).json({message: "NOT OFOUNDO"});
    } else {
      streamFromPath(videoFile, res);
    }
  })
}

export {addVideoStreamRoutes};
export {addAudioStreamRoutes};