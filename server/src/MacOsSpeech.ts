import {CharacterVoice} from "CharacterVoice";
import {exec} from 'child_process';
import {DisplaySpeechSystem, type SpeechSystem} from "SpeechSystem";
import {SpeechSystemOption} from "SpeechSystems";

/**
 * Speaks the given text using macOS's say command.
 * @param text The text to speak.
 * @param voice Optional. The voice to use.
 * @param wpm Optional. The speed rate (1 is default).
 * @returns A promise that resolves when speaking is done.
 */
function speak(text: string, voice?: string, wpm?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // Construct the command
    let command = `say "${text.replace(/"/g, '\\"')}"`;

    if (voice) {
      command += ` -v "${voice.replace(/"/g, '\\"')}"`;
    }

    if (wpm) {
      // The -r flag sets the speaking rate (words per minute)
      command += ` -r ${wpm}`;
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Speech process problem child:");
        console.log(stdout);
        console.error(stderr);
        reject(error);
        return;
      }
      resolve();
    });
  });
}

const VOICES: Array<CharacterVoice> = [
  new CharacterVoice("Serena (Premium)", "Mature English woman, slightly posh"),
  new CharacterVoice("Karen (Premium)", "Australian woman with a touch of boganity"),
  new CharacterVoice("Matilda (Premium)", "Australian woman no boganity"),
  new CharacterVoice("Zoe (Premium)", "American woman"),
  new CharacterVoice("Isha (Premium)", "Indian woman"),
  new CharacterVoice("Veena (Enhanced)", "Indian woman"),
  new CharacterVoice("Moira (Enhanced)", "Irish woman"),
  new CharacterVoice("Fiona (Enhanced)", "Scottish woman"),
  new CharacterVoice("Kate (Enhanced)", "English woman"),
]

const speed = 190; // fast, for debugging
// const speed = 120; // good fortune-teller speaking speed

class MacOsSpeech implements SpeechSystem {
  name = "MacOs Speech";
  currentIndex = 0;
  display = new DisplaySpeechSystem(this.name, VOICES);

  current(): SpeechSystemOption {
    return new SpeechSystemOption(this, VOICES[this.currentIndex].voiceId, VOICES[this.currentIndex].description);
  }

  options(): Array<string> {
    return VOICES.map(v => v.voiceId);
  }

  async speak(message: string) {
    await speak(message, VOICES[this.currentIndex].voiceId, speed)
      .catch((error) => {
        console.error('An error occurred during speech synthesis:', error);
      });
  }
}

export {MacOsSpeech};