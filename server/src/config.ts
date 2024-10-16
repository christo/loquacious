import fs from "fs";
import path from "path";

const DATA_DIRS = [
  "tts",
  "vision",
  "stt",
  "lipsync"
];

function ensureDataDirsExist(dataDir: string) {
  for (const d of DATA_DIRS) {
    const p = path.join(dataDir, d);
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, {recursive: true});
    }
  }
}

export {ensureDataDirsExist};