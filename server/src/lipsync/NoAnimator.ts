import {LipSyncAnimator, LipSyncResult} from "./LipSyncAnimator";
import {MediaFormat, MF_MP4} from "../media";

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

    animate(_imageFile: string, _speechFile: string, _fileKey: string): Promise<LipSyncResult> {
        return Promise.reject();
    }

    configure(_metadata: string): Promise<void> {
        return Promise.resolve();
    }

    getName(): string {
        return "No LipSync";
    }

    outputFormat(): MediaFormat | undefined {
        return undefined;
    }

    writeCacheFile(): Promise<void> {
        return Promise.resolve();
    }


}

export {NoAnimator};