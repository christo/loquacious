import {exec} from 'child_process';
import ffmpeg from "fluent-ffmpeg";
import type {PathLike} from "node:fs";
import path from "path";
import {timed} from "system/performance";
import {type MediaFormat, MF_MP3, type SupportedAudioFormat, TYPE_DEFAULT} from "media";
import {CharacterVoice} from "speech/CharacterVoice";
import {DisplaySpeechSystem, type SpeechSystem, type SpeechResult} from "speech/SpeechSystem";
import {SpeechSystemOption} from "speech/SpeechSystems";
import util from "util";
import {mkDirIfMissing} from "../system/config";


const execPromise = util.promisify(exec);

function mkVoiceFile(dataDir: string, mediaFormat: MediaFormat) {
  // TODO file tts under data/tts/<system>/<option>/tts_<db-id>.<format>
  const uniqueId = Date.now();
  return path.join(dataDir, `tts_${uniqueId}.${mediaFormat.extensions[0]}`);
}

async function convertAudio(desiredFormat: SupportedAudioFormat, path: string): Promise<string> {
  const finalPath = `${path}.${desiredFormat}`;
  console.log(`using ffmpeg to convert ${path} to ${desiredFormat} in ${finalPath}`);
  await new Promise<void>((resolve, reject) => {
    ffmpeg(path)
      .toFormat(desiredFormat)
      .on('error', (err) => reject(err))
      .on('end', () => resolve())
      .save(finalPath);
  });
  return finalPath;
}

const escaped = (x: string) => x.replace(/"/g, '\\"');

/**
 * Speaks the given text using macOS's say command.
 * @param text The text to speak.
 * @param voice The voice to use.
 * @param wpm Optional. The speed rate (1 is default).
 * @param dataDir where to store the generated speech audio files.
 * @returns A promise that resolves to the file to stream back.
 */
async function speak(text: string, voice: string, wpm: number, dataDir: string, mediaFormat: MediaFormat): Promise<string> {
  const savePath = mkVoiceFile(dataDir, mediaFormat);
  // Construct the command
  let command = `say "${escaped(text)}" -v "${escaped(voice)}" -r ${wpm} -o "${savePath}"`;

  try {
    await execPromise(command);
  } catch (e) {
    console.error(e);
    return Promise.reject(e);
  }

  let desiredFormat = TYPE_DEFAULT as SupportedAudioFormat;
  try {
    if (desiredFormat !== 'aiff') {
      return await timed("convert audio format", () => convertAudio(desiredFormat, savePath))
    } else {
      console.log(`no conversion required for aiff ${savePath}`);
      return savePath;
    }
  } catch (e) {
    console.error(`problem converting audio to ${desiredFormat}`, e);
    return Promise.reject(e);
  }
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
]

const speed = 130; // fast, for debugging
// const speed = 120; // good fortune-teller speaking speed

const MACOS_SPEECH_SYSTEM_NAME = "MacOs-TTS";

class MacOsSpeech implements SpeechSystem {
  name = MACOS_SPEECH_SYSTEM_NAME;
  private currentIndex = 0;
  display = new DisplaySpeechSystem(this.name, VOICES, this.free());
  private readonly dataDir: string;
  private fileFormat: MediaFormat;

  constructor(ttsDataDir: PathLike, fileFormat = MF_MP3) {
    this.dataDir = path.join(ttsDataDir.toString(), "macos");
    mkDirIfMissing(this.dataDir);
    this.fileFormat = fileFormat;
  }

  currentOption(): SpeechSystemOption {
    const v = VOICES[this.currentIndex];
    return new SpeechSystemOption(this, v.voiceId, v.description);
  }

  options(): Array<string> {
    return VOICES.map(v => v.voiceId);
  }

  async speak(message: string): Promise<SpeechResult> {
    try {
      const audioFile = await speak(message, VOICES[this.currentIndex].voiceId, speed, this.dataDir, this.fileFormat);
      return {
        filePath: () => audioFile
      }
    } catch (error) {
      console.error('An error occurred during speech synthesis:', error);
      return Promise.reject(error);
    }
  }

  pauseCommand(msDuration: number): string {
    // this implements silent pause for macos say
    // see https://developer.apple.com/library/archive/documentation/mac/pdf/Sound/Speech_Manager.pdf
    return `[[slnc ${msDuration}]]`;
  }

  getMetadata(): string | undefined {
    return VOICES[this.currentIndex].voiceId;
  }

  getName(): string {
    return this.name;
  }

  configure(metadata: string): Promise<void> {
    // TODO implement available voice detection somehow. the say command lists voices not yet installed
    let found = false;
    for (let i = 0; i < VOICES.length; i++) {
      if (VOICES[i].voiceId === metadata) {
        this.currentIndex = i;
        found = true;
      }
    }
    if (found) {
      return Promise.resolve();
    } else {
      return Promise.reject();
    }
  }

  free(): boolean {
    return true;
  }
}

export {MacOsSpeech, MACOS_SPEECH_SYSTEM_NAME};