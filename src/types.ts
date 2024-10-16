import type {CharacterVoice} from "../server/src/speech/CharacterVoice.ts";
import OpenAI from "openai";
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
    option: string,
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
    models: Model[]
  },
  speech: SpeechSystemDisplay,
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