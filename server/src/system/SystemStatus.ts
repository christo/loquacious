import type {Llm} from "llm/Llm";
import os from "os";
import type LlmService from "../llm/LlmService";

const formatBytes = (bytes: number) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) {
    return '0 Bytes';
  }
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

async function systemHealth(llm: Llm) {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  let tttHealth: any = {message: "disabled"};
  if (llm.enableHealth) {
    try {
      const r = await fetch(`${(llm.baseUrl)}/health`, {});
      tttHealth = await r.json();
    } catch (error) {
      tttHealth = {"error": `Health check failed ${error}`};
    }
  }

  return {
    freeMem: {
      bytes: freeMem,
      formatted: formatBytes(freeMem)
    },
    totalMem: {
      bytes: totalMem,
      formatted: formatBytes(totalMem),
    },
    tttHealth: tttHealth,
    perf: [
      {
        seconds: 60,
        measure: "stv",
        mean: -1,
        median: -1,
        p80: -1,
        p90: -1,
        worst: -1,
        best: -1,
        count: -1

      },
      {
        seconds: 600,
        measure: "stv",
        mean: -1,
        median: -1,
        p80: -1,
        p90: -1,
        worst: -1,
        best: -1,
        count: -1
      },
      {
        seconds: 6000,
        measure: "stv",
        mean: -1,
        median: -1,
        p80: -1,
        p90: -1,
        worst: -1,
        best: -1,
        count: -1
      }
    ]
  };
}

export {systemHealth};