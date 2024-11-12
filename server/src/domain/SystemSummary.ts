import {SpeechSystemOption} from "../speech/SpeechSystems";
import {RunInfo} from "./RunInfo";
import OpenAI from "openai";
import Model = OpenAI.Model;


type Module = {
  current: string,
  all: string[],
  isFree: boolean
}
type OptionedModule<T> = Module & {
  options: T[],
  currentOption: T,
}

type HealthError = {
  code: number,
  message: string;
  type: string;
}
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
type MemSpec = {
  bytes: number,
  formatted: string,
};
type HealthStatus = {
  freeMem: MemSpec,
  totalMem: MemSpec,
  perf: PerfStat[],
  error: HealthError | undefined;
  message: string | undefined;
};
type SystemSummary = {
  asAt: Date,
  mode: {
    // although isomorphic, mode is semantically distinct from a Module
    current: string,
    all: string[],
  },
  llm: Module & {
    options: Model[],
    currentOption: string,
  },
  tts: OptionedModule<SpeechSystemOption>,
  lipsync: Module,
  pose: Module,
  vision: Module,
  stt: Module,
  runtime: {
    run: RunInfo
  },
  health: HealthStatus,

}
export type {SystemSummary, Module, OptionedModule, HealthStatus, MemSpec, PerfStat, HealthError};