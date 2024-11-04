import type {CharacterVoice} from "./speech/CharacterVoice.ts";

// TODO delete this

type SpeechSystemDisplay = {
  current: {
    system: string,
    optionKey: string,
    optionName: string,
    isFree: boolean
  },
  systems: {
    name: string,
    options: CharacterVoice
  }
}


