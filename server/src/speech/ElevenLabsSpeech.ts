import {CharacterVoice} from "speech/CharacterVoice";
import {ElevenLabsClient, stream} from "elevenlabs";
import {DisplaySpeechSystem, type SpeechSystem} from "speech/SpeechSystem";
import {SpeechSystemOption} from "speech/SpeechSystems";

const VOICES = [
  new CharacterVoice("Alicia - Warm, expressive, posh, old British female","Alicia","Warm posh English older woman"),
  new CharacterVoice("Nala - African Female","Nala - African Female","African English woman"),
  new CharacterVoice("7NsaqHdLuKNFvEfjpUno","Seer Morganna","Slightly spooky and American"),
  new CharacterVoice("Andromeda - warm and lovely","Andromeda","Posh English woman, mid tones"),
  new CharacterVoice("ztyYYqlYMny7nllhThgo","Petra","Haughty, German middle-aged woman"),
  new CharacterVoice("Amina - clearly spoken African young lady","Amina","Maybe Botswana"),
  new CharacterVoice("Old Osirion Woman - Timeless, Mystical, Nurturing","Anne","Neutral English woman"),
  new CharacterVoice("Vidhi - Young & Bold","Vidhi - Young & Bold","Indian woman"),
  new CharacterVoice("wise-woman","wise-woman","African woman"),
  new CharacterVoice("Edith - elegant and mature","Edith","English middle-aged woman, storybook"),
  new CharacterVoice("Pauline - Australian Female","Kylie","Young woman with broad Australian accent"),
  new CharacterVoice("Sarah - warrior princess","Sarah","English middle-aged woman"),
  new CharacterVoice("Queen Rosamund - British, Older Woman","Queen Rosamund","Very posh"),
  new CharacterVoice("Brie - feisty, sparkly, lovely","Brie","Older, quite posh"),
  new CharacterVoice("Emily","Emily","Meditation"),
  new CharacterVoice("Jacqui Griffin","Jacqui Griffin","Australian woman, reasonably broad accent"),
  new CharacterVoice("Charlotte","Charlotte","Wise young woman, light Swedish accent"),
  new CharacterVoice("Ky9j3wxFbp3dSAdrkOEv", "Hex", "Middle-aged English woman with moderate tone"),
  new CharacterVoice("Lily","Lily","English woman, young, London"),
  new CharacterVoice("Dorothy","Dorothy","English woman, slightly South Eastern"),
  new CharacterVoice("Nicole","Nicole","Young American woman, whispering, ASMR"),
  new CharacterVoice("Sigrid - solemn, raspy, wise","Sigrid","English, slightly posh older woman"),
  new CharacterVoice("Grandma Margaret - Storybook Narrator","Margaret","Old and posh"),
  new CharacterVoice("Mima","Mima","Middle-aged Aarabic woman with warm tone"),
  new CharacterVoice("Tonia - Calm, soft and clear","Tonia","English middle-aged woman, calm"),
  new CharacterVoice("Amina - regal","Amina","English young regal woman"),
  new CharacterVoice("Ines","Ines","Young English woman"),
  new CharacterVoice("Minerva - Fantasy Professor","Minerva","Older English posh woman"),
  new CharacterVoice("Nora - cold and wise","Nora","English woman, educated, precise"),
  new CharacterVoice("Mampai","Mampai","African woman"),
  new CharacterVoice("Mistress Valerie","Mistress Valerie","English middle-aged posh woman"),
  new CharacterVoice("Agatha","Agatha","English older woman"),
  new CharacterVoice("Tarini - Expressive & Cheerful Narrator","Tarini","Indian woman"),
  new CharacterVoice("Victoria, Queen of England","Victoria","Posh English woman"),
  new CharacterVoice("Diana - Upbeat and Clear","Vashti","Indian woman"),
];

class ElevenLabsSpeech implements SpeechSystem {
  currentVoice = 0;
  characterVoice = VOICES[this.currentVoice];
  name = `ElevenLabs`;
  client: ElevenLabsClient;
  display: DisplaySpeechSystem;

  constructor() {
    this.client = new ElevenLabsClient({});
    this.display = new DisplaySpeechSystem(this.name, VOICES)
  }

  options(): Array<string> {
    return VOICES.map(v => v.voiceId);
  }

  currentOption(): SpeechSystemOption {
    return new SpeechSystemOption(this, this.options()[this.currentVoice]);
  }

  async speak(message: string) {
    try {
      console.log("about to generate voice");
      let start = new Date();
      const audio = await this.client.generate({
        voice: this.characterVoice.voiceId,
        stream: true,

        text: message,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.3,
          similarity_boost: 0.1,
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

  pauseCommand(msDuration: number): string {
    const sec = (msDuration / 1000).toFixed(1)
    return `<break time="${sec}s" />`;
  }
}

export {ElevenLabsSpeech};