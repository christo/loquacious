import {ElevenLabsClient, stream} from "elevenlabs";


class Voice {
  elevenlabs;

  constructor() {
    this.elevenlabs = new ElevenLabsClient({});
  }

  async speak(message: string) {
    const audio = await this.elevenlabs.generate({
      voice: "Charlotte",
      stream: true,

      text: message,
      model_id: "eleven_multilingual_v2"
    });

    await stream(audio);
  }
}

export {Voice};