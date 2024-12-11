import {LipSyncAnimator, LipSyncInput, LipSyncResult} from "./LipSyncAnimator";
import {MediaFormat} from "../media";

import {LoqModule} from "../system/LoqModule";
import {LipSyncLoqModule} from "./LipSyncLoqModule";

/**
 * Animator that doesn't animate.
 */
class NoAnimator implements LipSyncAnimator {
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
}

export {NoAnimator};