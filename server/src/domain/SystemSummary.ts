import {SpeechSystemOption} from "../speech/SpeechSystems";
import {RunInfo} from "./RunInfo";
import {LlmModel} from "../llm/LlmModel";
import {Module, ModuleWithOptions} from "./Module";

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
  llm: ModuleWithOptions<LlmModel>,
  tts: ModuleWithOptions<SpeechSystemOption>,
  lipsync: Module,
  pose: Module,
  vision: Module,
  stt: Module,
  runtime: {
    run: RunInfo
  },
  health: HealthStatus,
}

export type {SystemSummary, HealthStatus, MemSpec, PerfStat, HealthError};