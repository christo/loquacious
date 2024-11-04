import type {Llm} from "llm/Llm";
import os from "os";
import {HealthError, HealthStatus, MemSpec, PerfStat, SystemSummary} from "../domain/SystemSummary.ts";

const formatBytes = (bytes: number) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) {
    return '0 Bytes';
  }
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const mkPerfStat = (seconds: number, measure: string)=> {
  return {
    seconds: seconds,
    measure: measure,
    mean: -1,
    median: -1,
    p80: -1,
    p90: -1,
    worst: -1,
    best: -1,
    count: -1

  }
};

const mkMemSpec = (mem: number): MemSpec => ({
  bytes: mem,
  formatted: formatBytes(mem)
});

type MessageOrError = {
  message: string | undefined,
  error: HealthError | undefined,
};

async function systemHealth(llm: Llm): Promise<HealthStatus> {

  // TODO fix this wonky type
  let msgOrError: MessageOrError = {
    message: "disabled",
    error: undefined
  };
  if (llm.enableHealth) {
    try {
      const r = await fetch(`${(llm.baseUrl)}/health`, {});
      msgOrError = await r.json(); // TODO can we trust this will construc the right type?
    } catch (error) {
      msgOrError = {
        message: undefined,
        error: {
          message: `Health check failed ${error}`,
          code: 666,
          type: "wtf do I put here?"
        }
      };
    }
  }

  const healthStatus: HealthStatus = {
    freeMem: mkMemSpec(os.freemem()),
    totalMem: mkMemSpec(os.totalmem()),
    ...msgOrError,
    perf: [
      mkPerfStat(60, "stv"),
      mkPerfStat(600, "stv"),
      mkPerfStat(6000, "stv"),
    ]
  };
  return healthStatus;
}

export {systemHealth};