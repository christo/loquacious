import express, {Request, Response} from "express";
import fs from "fs";
import {extToFormat} from "media";
import path from "path";
import type {SpeechSystem} from "speech/SpeechSystem";
import {pipeline} from "stream";

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
export function streamFromPath(filePath: string, res: Response) {
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

export function fileStream(filename: string, res: Response) {
  console.log(`got request for file ${filename}`);
  if (!filename) {
    res.status(404).json({message: "No filename given"});
  } else {
    streamFromPath(filename, res);
  }
}
