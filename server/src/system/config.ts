import fs from "fs";
import path from "path";

const DATA_DIRS = [
  "tts",
  "vision",
  "stt",
  "lipsync"
];

function mkDirIfMissing(p: string) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, {recursive: true});
  }
}

function ensureDataDirsExist(dataDir: string) {
  for (const d of DATA_DIRS) {
    const p = path.join(dataDir, d);
    mkDirIfMissing(p);
  }
}

import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

/**
 * Retrieves the current Git commit SHA1 hash of the present repository.
 * @param cwd - Optional directory path where the Git command should be executed.
 * @returns A promise that resolves to the current commit SHA1 hash as a string.
 */
async function getCurrentCommitHash(cwd?: string): Promise<string> {
  try {
    const { stdout } = await execAsync('git rev-parse HEAD', { cwd });
    return stdout.trim();
  } catch (error) {
    console.error('Error getting current commit hash:', error);
    return Promise.reject(error);
  }
}


export {ensureDataDirsExist, mkDirIfMissing, getCurrentCommitHash};