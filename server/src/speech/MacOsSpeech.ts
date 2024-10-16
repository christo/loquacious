import {exec} from 'child_process';
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import type {SupportedAudioFormat} from "speech/audio";
import {CharacterVoice} from "speech/CharacterVoice";
import {DisplaySpeechSystem, type SpeechSystem} from "speech/SpeechSystem";
import {SpeechSystemOption} from "speech/SpeechSystems";
import util from "util";


const execPromise = util.promisify(exec);
const unlinkPromise = util.promisify(fs.unlink);

function mkVoiceFile() {
  // TODO file tts under data/tts/<system>/<option>/tts_<db-id>.<format>
  const tempDir = `${process.env.DATA_DIR}/tts`;
  const uniqueId = Date.now();
  return path.join(tempDir, `tts_${uniqueId}.aiff`);
}

async function convertAudio(desiredFormat: SupportedAudioFormat, path: string): Promise<string> {
  if (desiredFormat !== 'aiff') {
    const finalPath = `${path}.${desiredFormat}`;

    await new Promise<void>((resolve, reject) => {
      ffmpeg(path)
        .toFormat(desiredFormat)
        .on('error', (err) => reject(err))
        .on('end', () => resolve())
        .save(finalPath);
    });
    return finalPath;
  }
  console.log("no conversion required for aiff");
  return path;
}

const escaped = (x: string) => x.replace(/"/g, '\\"');

/**
 * Speaks the given text using macOS's say command.
 * @param text The text to speak.
 * @param voice The voice to use.
 * @param wpm Optional. The speed rate (1 is default).
 * @returns A promise that resolves to the file to stream back.
 */
async function speak(text: string, voice: string, wpm: number): Promise<string> {
  const savePath = mkVoiceFile();
  // Construct the command
  let command = `say "${escaped(text)}" -v "${escaped(voice)}" -r ${wpm} -o "${savePath}"`;

  try {
    let child = await execPromise(command);
    // TODO remove this debugging output
    console.log("say command output follows");
    console.log(child.stdout);
    console.error(child.stderr)
  } catch (e) {
    console.error(e);
    return Promise.reject(e);
  }

  let desiredFormat = "mp3" as SupportedAudioFormat;
  try {
    await convertAudio(desiredFormat, savePath);
  } catch (e) {
    console.error(`problem converting audio to ${desiredFormat}`, e);
    return Promise.reject(e);
  }
  return savePath;
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

const MACOS_SPEECH_SYSTEM_NAME = "MacOs Speech";

class MacOsSpeech implements SpeechSystem {
  name = MACOS_SPEECH_SYSTEM_NAME;
  currentIndex = 0;
  display = new DisplaySpeechSystem(this.name, VOICES);

  currentOption(): SpeechSystemOption {
    return new SpeechSystemOption(this, VOICES[this.currentIndex].voiceId, VOICES[this.currentIndex].description);
  }

  options(): Array<string> {
    return VOICES.map(v => v.voiceId);
  }

  async speak(message: string): Promise<string> {
    return await speak(message, VOICES[this.currentIndex].voiceId, speed)
      .catch((error) => {
        console.error('An error occurred during speech synthesis:', error);
        return Promise.reject(error);
      });
  }

  pauseCommand(msDuration: number): string {
    // this implements silent pause for macos say
    // see https://developer.apple.com/library/archive/documentation/mac/pdf/Sound/Speech_Manager.pdf
    return `[[slnc ${msDuration}]]`;
  }

}

export {MacOsSpeech, MACOS_SPEECH_SYSTEM_NAME};