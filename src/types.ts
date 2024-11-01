import OpenAI from "openai";
import type {CharacterVoice} from "../server/src/speech/CharacterVoice.ts";
import Model = OpenAI.Model;

type PerfStat = {
  seconds: number,
  measure: string,
  mean: number,
  median: number,
  p80: number,
  p90: number,
  best: number,
  worst: number,
  count: number,
}
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
export type System = {
  mode: {
    current: string,
    options: string[],
  },
  llmMain: {
    name: string,
    models: Model[],
    currentModel: string,
    isFree: boolean
  },
  speech: SpeechSystemDisplay,
  lipsync: {
    systems: string[],
    current: string
    isFree: boolean
  },
  runtime: {
    run: {
      id: number,
      created: string,
      metadata: string | null,
      sha1: string,
      deployment: {
        id: number,
        created : string,
        name: string,
        metadata: string | null,
      }
    }
  },
  health: HealthStatus
}
export type HealthError = {
  code: number,
  message: string;
  type: string;
}
type HealthStatus = {
  freeMem: {
    bytes: number,
    formatted: string,
  },
  totalMem: {
    bytes: number,
    formatted: string,
  },
  perf: PerfStat[],
  error: HealthError | null;
  message: string | null;
};