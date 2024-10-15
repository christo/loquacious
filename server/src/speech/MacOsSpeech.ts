import {CharacterVoice} from "speech/CharacterVoice";
import {exec} from 'child_process';
import {Simulate} from "react-dom/test-utils";
import {DisplaySpeechSystem, type SpeechSystem} from "speech/SpeechSystem";
import {SpeechSystemOption} from "speech/SpeechSystems";
import error = Simulate.error;

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
  new CharacterVoice("Serena (Premium)", "Serena", "Mature English woman, slightly posh"),
  new CharacterVoice("Matilda (Premium)", "Matilda","Australian woman no boganity"),
  new CharacterVoice("Veena (Enhanced)", "Veena","Indian woman"),
  new CharacterVoice("Karen (Premium)", "Karen", "Australian woman with a touch of boganity"),
  new CharacterVoice("Zoe (Premium)", "Zoe", "American woman"),
  new CharacterVoice("Isha (Premium)", "Isha", "Indian woman"),
  new CharacterVoice("Moira (Enhanced)", "Moira", "Irish woman"),
  new CharacterVoice("Fiona (Enhanced)", "Fiona", "Scottish woman"),
  new CharacterVoice("Kate (Enhanced)", "Kate", "English woman"),
]

const speed = 130; // fast, for debugging
// const speed = 120; // good fortune-teller speaking speed

class MacOsSpeech implements SpeechSystem {
  name = "MacOs Speech";
  currentIndex = 0;
  display = new DisplaySpeechSystem(this.name, VOICES);

  currentOption(): SpeechSystemOption {
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

  pauseCommand(msDuration: number): string {
    return `[[slnc ${msDuration}]]`;
  }

}

export {MacOsSpeech};