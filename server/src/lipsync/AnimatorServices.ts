import path from "path";
import {FakeLipSync} from "./FakeLipSync";
import {FalSadtalker} from "./FalSadtalker";
import type {LipSyncAnimator} from "./LipSyncAnimator";

class AnimatorServices {
  private readonly animators: LipSyncAnimator[];
  private lipsyncIndex = 0;

  constructor(basedir: string) {
    const basedirLipsync = path.join(basedir, "lipsync");
    this.animators = [
      new FalSadtalker(basedirLipsync),
      new FakeLipSync(basedirLipsync)
    ].filter(s => s.canRun())
  }

  current(): LipSyncAnimator {
    return this.animators[this.lipsyncIndex];
  }

  all(): LipSyncAnimator[] {
    return [...this.animators];
  }
}

export default AnimatorServices;