
type LipSyncResult = {
  // TODO figure out what this should be
}

interface LipSync {
  lipSync(imageFile: string, speechFile: string): Promise<LipSyncResult>;
}

export type {LipSync, LipSyncResult};