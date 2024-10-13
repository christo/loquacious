import {ElevenLabsClient, stream} from "elevenlabs";
import type {Voice} from "./Voice";

class CharacterVoice {
  voiceId: string;
  description: string;

  constructor(voiceId: string, description: string) {
    this.voiceId = voiceId;
    this.description = description;
  }
}

const VOICE_CHARLOTTE = new CharacterVoice("Charlotte", "Slight Swedish accent");
const VOICE_EMILY = new CharacterVoice("Emily", "Meditative");
const VOICE_LILY = new CharacterVoice("Lily", "todo");
const VOICE_DOROTHY = new CharacterVoice("Dorothy", "todo");
const VOICE_NICOLE = new CharacterVoice("Nicole", "Young American woman, whispering, ASMR");
const VOICE_SIGRID = new CharacterVoice("Sigrid - solemn, raspy, wise", "English, slightly posh older woman");

const VOICES = [
  VOICE_SIGRID,
  VOICE_CHARLOTTE,
  VOICE_EMILY,
  VOICE_LILY,
  VOICE_DOROTHY,
  VOICE_NICOLE,
];

class ElevenLabsVoice implements Voice {
  currentVoice = 0;
  characterVoice = VOICES[this.currentVoice];
  name = `ElevenLabs ${this.characterVoice.voiceId}`;
  elevenlabs;

  constructor() {
    this.elevenlabs = new ElevenLabsClient({});
  }

  async speak(message: string) {
    try {
      console.log("about to generate voice");
      let start = new Date();
      const audio = await this.elevenlabs.generate({
        voice: this.characterVoice.voiceId,
        stream: true,

        text: message,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.1,
          similarity_boost: 0.3,
          style: 0.8,
          use_speaker_boost: true
        }
      });
      console.log(`voice generation complete in ${new Date().getTime() - start.getTime()} ms`)

      console.log("about to stream voice");
      start = new Date();

      await stream(audio);

      console.log(`voice streaming finished ${new Date().getTime() - start.getTime()} ms`);
    } catch (e) {
      console.error("Error while creating voice stream", e);
    }
  }
}

export {ElevenLabsVoice};