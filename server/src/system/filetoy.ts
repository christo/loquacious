import fs from "fs";

function mkDirIfMissing(p: string) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, {recursive: true});
  }
}

const escapeFilepart = (x: string) => x.replace(/"/g, '\\"');


export {mkDirIfMissing, escapeFilepart};