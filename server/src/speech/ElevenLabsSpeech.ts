import {ElevenLabsClient} from "elevenlabs";
import fs from 'fs';
import type {PathLike} from "node:fs";
import path from "path";
import {CharacterVoice} from "speech/CharacterVoice";
import {DisplaySpeechSystem, type SpeechSystem} from "speech/SpeechSystem";
import {SpeechSystemOption} from "speech/SpeechSystems";
import {timed} from "system/performance";
import {mkDirIfMissing} from "../system/config";

const VOICES = [
  new CharacterVoice("Sigrid - solemn, raspy, wise", "Sigrid", "English, slightly posh older woman"),
  new CharacterVoice("Andromeda - warm and lovely", "Andromeda", "Posh English woman, mid tones"),
  new CharacterVoice("Ky9j3wxFbp3dSAdrkOEv", "Hex", "Middle-aged Northern English woman with moderate tone"),
  new CharacterVoice("Old Osirion Woman - Timeless, Mystical, Nurturing", "Anne", "Neutral English woman"),
  new CharacterVoice("Alicia - Warm, expressive, posh, old British female", "Alicia", "Warm posh English older woman"),
  new CharacterVoice("Emily", "Emily", "Meditation, American woman"),
  new CharacterVoice("Jacqui Griffin", "Jacqui", "Australian woman, reasonably broad accent"),
  new CharacterVoice("Dorothy", "Dorothy", "English woman, slightly South Eastern"),
  new CharacterVoice("Vidhi - Young & Bold", "Vidhi", "Expressive Indian woman"),
  new CharacterVoice("ztyYYqlYMny7nllhThgo", "Petra", "Haughty, German middle-aged woman"),
  new CharacterVoice("Charlotte", "Charlotte", "Wise young woman, light Swedish accent"),
  new CharacterVoice("Lily", "Lily", "English woman, young, London"),
  new CharacterVoice("Sarah - warrior princess", "Sarah", "English middle-aged woman"),
  new CharacterVoice("Amina - regal", "Amina", "Posh Scottish-ish middle-aged woman"),
  new CharacterVoice("Nala - African Female", "Nala", "African English woman"),
  new CharacterVoice("Amina - clearly spoken African young lady", "Desi", "Maybe Botswana"),
  new CharacterVoice("wise-woman", "Jabari", "African woman"),
  new CharacterVoice("Edith - elegant and mature", "Edith", "English middle-aged woman, storybook"),
  new CharacterVoice("Pauline - Australian Female", "Kylie", "Young woman with broad Australian accent"),
  new CharacterVoice("Queen Rosamund - British, Older Woman", "Rosamund", "Very posh"),
  new CharacterVoice("Brie - feisty, sparkly, lovely", "Brie", "Older, quite posh"),
  new CharacterVoice("Nicole", "Nicole", "Young American woman, whispering, ASMR"),
  new CharacterVoice("Grandma Margaret - Storybook Narrator", "Margaret", "Old and posh"),
  new CharacterVoice("Mima", "Mima", "Middle-aged Aarabic woman with warm tone"),
  new CharacterVoice("Tonia - Calm, soft and clear", "Tonia", "English middle-aged woman, calm"),
  new CharacterVoice("Minerva - Fantasy Professor", "Minerva", "Older English posh woman"),
  new CharacterVoice("Nora - cold and wise", "Nora", "English woman, educated, precise"),
  new CharacterVoice("Mampai", "Mampai", "African woman"),
  new CharacterVoice("Mistress Valerie", "Valerie", "English middle-aged posh woman"),
  new CharacterVoice("Agatha", "Agatha", "English older woman"),
  new CharacterVoice("Tarini - Expressive & Cheerful Narrator", "Tarini", "Indian woman"),
  new CharacterVoice("Victoria, Queen of England", "Victoria", "Posh English woman"),
  new CharacterVoice("Diana - Upbeat and Clear", "Vashti", "Indian woman"),
  new CharacterVoice("Ines", "Ines", "Young English woman but with weird rolled R"),
];

type ElevenLabsPartialConfig = BulkPartialConfig | StreamPartialConfig;
type ElevenLabsVoiceSettings = {
  stability: number,
  similarity_boost: number,
  style: number,
  use_speaker_boost: boolean
}

type BulkPartialConfig = {
  type: "bulk",
  config: {
    voice: string,
    output_format: string,
    model_id: string,
    voice_settings: ElevenLabsVoiceSettings,
  }
};

type StreamPartialConfig = {
  type: "bulk",
  config: {
    stream: true,   //sic
    voice: string,
    output_format: string,
    model_id: string,
    voice_settings: ElevenLabsVoiceSettings,
  }
};

/** Implementation that calls elevenlabs.ai - requires an API key env var. */
class ElevenLabsSpeech implements SpeechSystem {
  private currentVoice = 0;
  private characterVoice = VOICES[this.currentVoice];
  readonly name = `ElevenLabs-TTS`;
  readonly display: DisplaySpeechSystem;
  client: ElevenLabsClient;
  private readonly dataDir: string;
  /**
   * Partial config wraps the bulk or stream api call parameters but excludes the
   * text because that changes with every invocation.
   * @private
   */
  private partialConfig: ElevenLabsPartialConfig = {
    type: "bulk",
    config: {
      voice: this.characterVoice.voiceId,
      output_format: "mp3_44100_128",
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.1,
        style: 0.8,
        use_speaker_boost: true
      }
    }
  };

  constructor(ttsDataDir: PathLike) {
    this.dataDir = path.join(ttsDataDir.toString(), "el");
    mkDirIfMissing(this.dataDir);
    this.client = new ElevenLabsClient({});
    this.display = new DisplaySpeechSystem(this.name, VOICES)
  }

  options(): Array<string> {
    return VOICES.map(v => v.voiceId);
  }

  currentOption(): SpeechSystemOption {
    const currentVoice = VOICES[this.currentVoice];
    return new SpeechSystemOption(this, currentVoice.voiceId, currentVoice.name, currentVoice.description);
  }

  async speak(message: string): Promise<string> {
    const outFilename = `el_tts_${Date.now()}_${this.characterVoice.name.replaceAll(/\s/g, '-')}.mp3`;
    const outFile = path.join(this.dataDir, outFilename);
    try {
      const audio = await timed("elevenlabs generate speech",
        () => this.client.generate({
          text: message,
          ...(this.getConfig().config)
        } as ElevenLabsClient.GeneratAudioBulk));
      const outStream = fs.createWriteStream(outFile);
      return new Promise<string>((resolve, reject) => {
        outStream.on('error', (err) => {
          console.error('Error in writing the file:', err);
          reject();
        });

        outStream.on('finish', () => {
          console.log('File writing completed successfully.');
          resolve(outFile);
        });
        audio.pipe(outStream);
      })

    } catch (e) {
      console.error("Error while creating voice stream", e);
    }
    return outFile;
  }

  private getConfig(): ElevenLabsPartialConfig {
    return this.partialConfig;
  }

  pauseCommand(msDuration: number): string {
    const sec = (msDuration / 1000).toFixed(1)
    return `<break time="${sec}s" />`;
  }

  getMetadata(): string | undefined {
    // API call can be bulk or stream, so we store that this way:
    return JSON.stringify(this.getConfig());
  }

  getName(): string {
    return this.name;
  }

  configure(metadata: string): Promise<void> {
    try {
      this.partialConfig = JSON.parse(metadata);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

export {ElevenLabsSpeech};