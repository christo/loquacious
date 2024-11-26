import {LipSyncAnimator, LipSyncInput, LipSyncLoqModule, LipSyncResult} from "./LipSyncAnimator";
import {MediaFormat} from "../media";

import {LoqModule} from "../system/LoqModule";

/**
 * Animator that doesn't animate.
 */
class NoAnimator implements LipSyncAnimator {
    private readonly module: LipSyncLoqModule;


    constructor() {
        this.module = new LipSyncLoqModule(this);
    }

    canRun(): boolean {
        return true;
    }

    free(): boolean {
        return true;
    }

    getMetadata(): string | undefined {
        return undefined;
    }

    animate(_imageFile: string, _speechFile: Promise<string>, _fileKey: string): Promise<LipSyncResult> {
        return Promise.reject();
    }

    configure(_metadata: string): Promise<void> {
        return Promise.resolve();
    }

    getName(): string {
        return "No Animator";
    }

    videoOutputFormat(): MediaFormat | undefined {
        return undefined;
    }

    postResponseHook(): Promise<void> {
        return Promise.resolve();
    }

    loqModule(): LoqModule<LipSyncInput, LipSyncResult> {
        return this.module;
    }



}

export {NoAnimator};