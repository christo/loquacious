import {exec} from 'child_process';
import type {SpeechSystem} from "SpeechSystem";
import {SpeechSystemOption} from "SpeechSystems";

/**
 * Speaks the given text using macOS's say command.
 * @param text The text to speak.
 * @param voice Optional. The voice to use.
 * @param speed Optional. The speed rate (1 is default).
 * @returns A promise that resolves when speaking is done.
 */
function speak(text: string, voice?: string, speed?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // Construct the command
    let command = `say "${text.replace(/"/g, '\\"')}"`;

    if (voice) {
      command += ` -v "${voice.replace(/"/g, '\\"')}"`;
    }

    if (speed) {
      // The -r flag sets the speaking rate (words per minute)
      command += ` -r ${speed}`;
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

const VOICES = [
  ["Serena", "English woman"],
  ["Alex", "man"]
]
const speed = 120;

class MacOsSpeech implements SpeechSystem {
  name = "MacOs Speech";

  currentIndex = 0;

  current(): SpeechSystemOption {
    return new SpeechSystemOption(this, VOICES[this.currentIndex][0], VOICES[this.currentIndex][1]);
  }


  options(): Array<string> {
    return VOICES.map(v => v[0]);
  }

  async speak(message: string) {
    speak(message, VOICES[this.currentIndex][0], speed)
      .catch((error) => {
        console.error('An error occurred during speech synthesis:', error);
      });
  }
}

export {MacOsSpeech};