import path from "path";
import {FakeAnimator} from "./FakeAnimator";
import {FalSadtalker} from "./FalSadtalker";
import type {Animator} from "./Animator";
import {NoAnimator} from "./NoAnimator";
import {Gateway} from "../system/Gateway";

class AnimatorGateway implements Gateway<Animator> {
  private readonly animators: Animator[];
  private lipsyncIndex = 0;

  constructor(basedir: string) {
    const basedirLipsync = path.join(basedir, "lipsync");
    this.animators = [
      new FalSadtalker(basedirLipsync),
      new FakeAnimator(basedirLipsync),
      new NoAnimator()
    ].filter(s => s.canRun())
  }

  current(): Animator {
    return this.animators[this.lipsyncIndex];
  }

  all(): Animator[] {
    return [...this.animators];
  }

  setCurrent(value: string) {
    for (let i = 0; i < this.animators.length; i++) {
      if (this.animators[i].getName() === value) {
        this.lipsyncIndex = i;
      }
    }
  }
}

export default AnimatorGateway;