import express, {Request, Response} from "express";
import fs from "fs";
import type {LipSync} from "LipSync";
import path from "path";
import {pipeline} from "stream";

function streamFromPath(videoPath: string, res: Response) {
  const readStream = fs.createReadStream(videoPath);
  res.setHeader('Content-Type', "video/mp4");
  const ppp = videoPath.split(path.sep);
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