import {exec} from 'child_process';
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import {type MediaFormat, MF_MP3} from "media";
import type {PathLike} from "node:fs";
import path from "path";
import {CharacterVoice} from "speech/CharacterVoice";
import {DisplaySpeechSystem, type SpeechSystem} from "speech/SpeechSystem";
import {SpeechSystemOption} from "speech/TtsGateway";
import {timed} from "system/performance";
import util from "util";
import {Message} from "../domain/Message";
import {isMac} from "../system/config";

import {escapeFilepart, mkDirIfMissing} from "../system/filetoy";

const execPromise = util.promisify(exec);
const unlinkPromise = util.promisify(fs.unlink);

async function convertAudio(desiredFormat: string, path: string): Promise<string> {
  const finalPath = `${path}.${desiredFormat}`;
  // console.log(`using ffmpeg to convert ${path} to ${desiredFormat} in ${finalPath}`);
  await new Promise<void>((resolve, reject) => {
    ffmpeg(path)
        .toFormat(desiredFormat)
        .on('error', (err) => reject(err))
        .on('end', () => resolve())
        .save(finalPath);
  });
  return finalPath;
}


const VOICES: Array<CharacterVoice> = [
  new CharacterVoice("Serena (Premium)", "Serena", "Mature English woman, slightly posh"),
  new CharacterVoice("Matilda (Premium)", "Matilda", "Australian woman"),
  new CharacterVoice("Veena (Enhanced)", "Veena", "Indian woman"),
  new CharacterVoice("Karen (Premium)", "Karen", "Australian woman, upper middle bogan"),
  new CharacterVoice("Zoe (Premium)", "Zoe", "American woman"),
  new CharacterVoice("Isha (Premium)", "Isha", "Indian woman"),
  new CharacterVoice("Moira (Enhanced)", "Moira", "Irish woman"),
  new CharacterVoice("Fiona (Enhanced)", "Fiona", "Scottish woman"),
  new CharacterVoice("Kate (Enhanced)", "Kate", "English woman"),
];

const wpm = 130; // fast, for debugging
// const speed = 120; // good fortune-teller speaking speed

const MACOS_SPEECH_SYSTEM_NAME = "MacOs-TTS";

class MacOsSpeech implements SpeechSystem {
  name = MACOS_SPEECH_SYSTEM_NAME;
  display = new DisplaySpeechSystem(this.getName(), VOICES, this.free());
  /**
   * Only runs on MacOS.
   */
  canRun = isMac;
  private currentIndex = 0;
  private readonly dataDir: string;
  private fileFormat: MediaFormat;

  constructor(ttsDataDir: PathLike, fileFormat = MF_MP3) {
    this.dataDir = path.join(ttsDataDir.toString(), "macos");
    mkDirIfMissing(this.dataDir);
    this.fileFormat = fileFormat;
  }

  currentOption(): SpeechSystemOption {
    const v = VOICES[this.currentIndex];
    return new SpeechSystemOption(this, v.voiceId, v.name, v.description);
  }

  options(): Array<SpeechSystemOption> {
    return VOICES.map(v => new SpeechSystemOption(this, v.voiceId, v.name, v.description));
  }

  setCurrentOption(value: string): Promise<void> {
    for (let i = 0; i < VOICES.length; i++) {
      if (VOICES[i].name === value) {
        this.currentIndex = i;
        console.log(`${this.name} setting voice to ${value}`);
        return Promise.resolve();
      }
    }
    return Promise.reject(`${this.name}: No known voice ${value}`);
  }

  async speak(message: string, basename: string): Promise<string> {
    try {
      const voice = VOICES[this.currentIndex];
      const voicePart = voice.name.replaceAll(/[\s\/]/g, '-');
      const filename = `tts_${basename}_${voicePart}`;
      const savePath = path.join(this.dataDir, filename);
      const aiffFile = `${savePath}.aiff`;
      let command = `say "${escapeFilepart(message)}" -v "${escapeFilepart(voice.voiceId)}" -r ${wpm} -o "${aiffFile}"`;
      let result: Promise<string>;
      try {
        await execPromise(command);
        let desiredFormat = this.fileFormat.extensions[0];
        try {
          if (desiredFormat !== 'aiff') {
            result = timed("convert audio format", () => convertAudio(desiredFormat, aiffFile)).then(_s => {
              // shouldn't need await
              timed("clean up aiff audio", () => unlinkPromise(aiffFile));
              return _s;
            });
          } else {
            console.log(`no conversion required for aiff ${savePath}`);
            result = Promise.resolve(savePath);
          }
        } catch (e) {
          console.error(`problem converting audio to ${desiredFormat}`, e);
          result = Promise.reject(e);
        }
      } catch (e) {
        console.error("problem executing say command", e);
        result = Promise.reject(e);
      }
      return result

    } catch (error) {
      console.error('An error occurred during speech synthesis:', error);
      return Promise.reject(error);
    }
  }

  speechOutputFormat(): MediaFormat {
    return MF_MP3;
  }

  pauseCommand(msDuration: number): string {
    // this implements silent pause for macos say
    // see https://developer.apple.com/library/archive/documentation/mac/pdf/Sound/Speech_Manager.pdf
    return `[[slnc ${msDuration}]]`;
  }

  removePauseCommands(m: Message): Message {
    if (m.isFromUser) {
      return m;
    } else {
      // attempt to remove any llm-generated pause commands from the message
      const strpped = m.content.replaceAll(/\[\[slnc \d+\]\]/g, '');
      return new Message(m.id, m.created, strpped, m.creatorId, false);
    }
  }

  getMetadata(): string | undefined {
    return VOICES[this.currentIndex].voiceId;
  }

  getName(): string {
    return this.name;
  }

  configure(metadata: string): Promise<void> {
    // TODO implement available voice detection somehow. the say command lists voices not yet installed and calling say
    //      with a missing voice produces no audio (IIRC)
    let found = false;
    for (let i = 0; i < VOICES.length; i++) {
      if (VOICES[i].voiceId === metadata) {
        this.currentIndex = i;
        found = true;
      }
    }
    return found ? Promise.resolve() : Promise.reject();
  }

  free(): boolean {
    return true;
  }
}

export {MacOsSpeech, MACOS_SPEECH_SYSTEM_NAME};