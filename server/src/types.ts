import OpenAI from "openai";
import type {CharacterVoice} from "./speech/CharacterVoice.ts";
import {SpeechSystemOption} from "./speech/SpeechSystems.ts";
import {Run} from "./domain/Run.ts";
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
type Module = {
  current: string,
  all: string[],
  isFree: boolean
}
type OptionedModule<T> = Module & {
  options: T[],
  currentOption: T,
}

/**
 * Like {@link Run} with ISO serialised dates.
 */
class RunInfo {
  id: number;
  created: string;
  metadata: string;
  sha1: string;
  deployment: {
    id: number;
    created: string;
    name: string;
    metadata: string;
  }

  constructor(run: Run) {
    // TODO this manual shovelling bothers me
    this.id = run.id;
    this.created = run.created.toISOString();
    this.metadata = run.metadata;
    this.sha1 = run.sha1;
    this.deployment = {
      id: run.deployment.id,
      created: run.deployment.created.toISOString(),
      metadata: run.deployment.metadata,
      name: run.deployment.name,
    }
  }
}

type HealthError = {
  code: number,
  message: string;
  type: string;
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
    // mode is semantically distinct from a Module
    current: string,
    all: string[],
  },
  llm: Module & {
    options: Model[],
    currentOption: string, // TODO change type to Model
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

export type {PerfStat, HealthStatus, MemSpec, HealthError, SystemSummary, Module, OptionedModule};
export {RunInfo};