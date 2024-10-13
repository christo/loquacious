import {ElevenLabsClient, stream} from "elevenlabs";
import type {Voice} from "./Voice";

// Slight Swedish accent
const VOICE_CHARLOTTE = "Charlotte";
// Meditation
const VOICE_EMILY = "Emily";
const VOICE_LILY = "Lily";

const VOICE_DOROTHY = "Dorothy";
// young American woman, whispering, ASMR
const VOICE_NICOLE = "Nicole";
const VOICE_SIGRID = "Sigrid - solemn, raspy, wise";

class ElevenLabsVoice implements Voice {
  myVoice = VOICE_SIGRID;
  name = `ElevenLabs ${this.myVoice}`;
  elevenlabs;

  constructor() {
    this.elevenlabs = new ElevenLabsClient({});
  }

  async speak(message: string) {
    try {
      console.log("about to generate voice");
      const audio = await this.elevenlabs.generate({
        voice: this.myVoice,
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
      console.log("about to stream voice");

      await stream(audio);

      console.log("voice streaming finished");
    } catch (e) {
      console.error("Error while creating voice stream", e);
    }
  }
}

export {ElevenLabsVoice};