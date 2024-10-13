import type {Voice} from "Voice";

import { exec } from 'child_process';

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

const voice = 'Serena'; // Optional
const speed = 120; // Optional. Default macOS rate is 175 wpm

class SystemVoice implements Voice {
  name = "System Voice";
  async speak(message: string) {
    speak(message, voice, speed)
      .catch((error) => {
        console.error('An error occurred during speech synthesis:', error);
      });
  }

}

export {SystemVoice};