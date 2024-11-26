import {ElevenLabsClient} from "elevenlabs";
import fs from 'fs';
import type {PathLike} from "node:fs";
import path, {basename} from "path";
import {CharacterVoice} from "speech/CharacterVoice";
import {
  AsyncSpeechResult,
  DisplaySpeechSystem,
  SpeechInput,
  type SpeechResult,
  type SpeechSystem, SpeechSystemLoqModule
} from "speech/SpeechSystem";
import {SpeechSystemOption} from "speech/SpeechSystems";
import {timed} from "system/performance";
import {Message} from "../domain/Message";
import {type MediaFormat, MF_MP3} from "../media";
import {hasEnv} from "../system/config";

import {mkDirIfMissing} from "../system/filetoy";
import {Tts} from "../domain/Tts";
import {LoqModule} from "../system/Loquacious";

const VOICES = [
  new CharacterVoice("Andromeda - warm and lovely", "Andromeda", "Posh English woman, mid tones (5)"),
  new CharacterVoice("Alicia - Warm, expressive, posh, old British female", "Alicia", "Warm posh English older woman ++"),
  new CharacterVoice("Charlotte", "Charlotte", "Wise young woman, light Swedish accent"),
  new CharacterVoice("Vidhi - Young & Bold", "Vidhi", "Expressive Indian woman (3)"),
  new CharacterVoice("Nicole", "Nicole", "Young American woman, whispering, ASMR"),
  new CharacterVoice("Agatha", "Agatha", "English older woman, thin"),
  new CharacterVoice("Lily", "Lily", "English woman, young, London"),
  new CharacterVoice("Valentino", "Valentino", "Deep posh English older man"),
  new CharacterVoice("Kim Selch - Pro Studio Recording", "Kaspar", "Deep Danish older man"),
  new CharacterVoice("Northern Terry", "Terry", "Northern English man"),
  new CharacterVoice("U1Vk2oyatMdYs096Ety7", "Michael", "Urban English middle-aged man"),
  new CharacterVoice("Old Osirion Woman - Timeless, Mystical, Nurturing", "Anne", "Neutral English woman"),
  new CharacterVoice("Ky9j3wxFbp3dSAdrkOEv", "Hex", "Middle-aged Northern English woman with moderate tone"),
  new CharacterVoice("Sigrid - solemn, raspy, wise", "Sigrid", "English, slightly posh older woman +"),
  new CharacterVoice("Emily", "Emily", "Meditation, American woman"),
  new CharacterVoice("Jacqui Griffin", "Jacqui", "Australian woman, reasonably broad accent"),
  new CharacterVoice("Dorothy", "Dorothy", "English woman, slightly South Eastern"),
  new CharacterVoice("ztyYYqlYMny7nllhThgo", "Petra", "Haughty, German middle-aged woman"),
  new CharacterVoice("Sarah - warrior princess", "Sarah", "English middle-aged woman"),
  new CharacterVoice("Amina - regal", "Amina", "Posh Scottish-ish middle-aged woman"),
  new CharacterVoice("Nala - African Female", "Nala", "African English woman"),
  new CharacterVoice("Amina - clearly spoken African young lady", "Desi", "Maybe Botswana"),
  new CharacterVoice("wise-woman", "Jabari", "African woman"),
  new CharacterVoice("Edith - elegant and mature", "Edith", "English middle-aged woman, storybook"),
  new CharacterVoice("Brie - feisty, sparkly, lovely", "Brie", "Older, quite posh"),
  new CharacterVoice("Mima", "Mima", "Middle-aged Aarabic woman with warm tone"),
  new CharacterVoice("Tonia - Calm, soft and clear", "Tonia", "English middle-aged woman, calm"),
  new CharacterVoice("Minerva - Fantasy Professor", "Minerva", "Older English posh woman"),
  new CharacterVoice("Nora - cold and wise", "Nora", "English woman, educated, precise"),
  new CharacterVoice("Mampai", "Mampai", "African woman"),
  new CharacterVoice("Mistress Valerie", "Valerie", "English middle-aged posh woman"),
  new CharacterVoice("Victoria, Queen of England", "Victoria", "Posh English woman"),
  new CharacterVoice("Tarini - Expressive & Cheerful Narrator", "Tarini", "Indian woman - not enough variety"),
  // not current:
  /*
  new CharacterVoice("Diana - Upbeat and Clear", "Vashti", "Indian woman"),
  */
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

/**
 * Implementation that calls elevenlabs.ai - requires an API key env var.
 */
class ElevenLabsSpeech implements SpeechSystem {
  private static NAME = `ElevenLabs-TTS`;

  private client: ElevenLabsClient;

  readonly display: DisplaySpeechSystem;

  /**
   * Requires environment variable ELEVEN_LABS_API_KEY
   */
  canRun = hasEnv("ELEVENLABS_API_KEY");
  private currentVoice = VOICES.findIndex(v => v.name === "Sigrid") ;
  private readonly dataDir: string;

  /**
   * Partial config wraps the bulk or stream api call parameters but excludes the
   * text because that changes with every invocation.
   * @private
   */
  private partialConfig: () => ElevenLabsPartialConfig = () => ({
    type: "bulk",
    config: {
      voice: VOICES[this.currentVoice].voiceId,
      output_format: "mp3_44100_128",
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.1,
        style: 0.8,
        use_speaker_boost: true
      }
    }
  });
  private readonly module: SpeechSystemLoqModule;

  constructor(ttsDataDir: PathLike) {
    this.dataDir = path.join(ttsDataDir.toString(), "el");
    mkDirIfMissing(this.dataDir);
    this.client = new ElevenLabsClient({});
    this.display = new DisplaySpeechSystem(this.getName(), VOICES, this.free())
    this.module = new SpeechSystemLoqModule(this);
  }

  options() {
    return VOICES.map(v => new SpeechSystemOption(this, v.voiceId, v.name, v.description));
  }

  currentOption(): SpeechSystemOption {
    const currentVoice = VOICES[this.currentVoice];
    return new SpeechSystemOption(this, currentVoice.voiceId, currentVoice.name, currentVoice.description);
  }

  setCurrentOption(value: string): Promise<void> {
    for (let i = 0; i < VOICES.length; i++) {
      if (VOICES[i].name === value) {
        this.currentVoice = i;
        console.log(`${this.getName()} setting voice to ${value}`);
        return Promise.resolve();
      }
    }
    return Promise.reject(`didn't find voice option ${value}`);
  }

  async speak(message: string, basename: string): Promise<SpeechResult> {
    const outFilename = `el_tts_${basename}_${VOICES[this.currentVoice].name.replaceAll(/\s\//g, '-')}.mp3`;
    const outFile = path.join(this.dataDir, outFilename);
    try {
      const audio = await timed("elevenlabs generate speech",
          () => this.client.generate({
            text: message,
            ...(this.getConfig().config)
          } as ElevenLabsClient.GeneratAudioBulk));
      const outStream = fs.createWriteStream(outFile);
      return new Promise<SpeechResult>((resolve, reject) => {
        outStream.on('error', (err) => {
          console.error('Error in writing the file:', err);
          reject();
        });

        outStream.on('finish', () => {
          console.log('speech file writing completed successfully.');
          // hack alert - tts has a circular dependency in construction
          resolve(AsyncSpeechResult.fromValues(outFile, undefined));
        });
        audio.pipe(outStream);
      })

    } catch (e) {
      console.error("Error while creating voice stream", e);
      return Promise.reject(e);
    }
  }

  pauseCommand(msDuration: number): string {
    const sec = (msDuration / 1000).toFixed(1)
    return `<break time="${sec}s" />`;
  }

  removePauseCommands(m: Message): Message {
    if (m.isFromUser) {
      return m;
    } else {
      // attempt to remove any llm-generated pause commands from the message
      const strpped = m.content.replaceAll(/<break\s+time="\d+s"\d*\/>/g, '');
      return new Message(m.id, m.created, strpped, m.creatorId, false);
    }
  }

  getMetadata(): string | undefined {
    // API call can be bulk or stream, so we store that this way:
    return JSON.stringify(this.getConfig());
  }

  getName(): string {
    return ElevenLabsSpeech.NAME;
  }

  configure(metadata: string): Promise<void> {
    try {
      // hack! rewriting the function here smells
      const partialConfig = JSON.parse(metadata);
      this.partialConfig = () => partialConfig;
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  free(): boolean {
    return false;
  }

  speechOutputFormat(): MediaFormat {
    return MF_MP3;
  }

  private getConfig(): ElevenLabsPartialConfig {
    return this.partialConfig();
  }

  loqModule(): LoqModule<SpeechInput, SpeechResult> {
    return this.module;
  }
}

export {ElevenLabsSpeech};