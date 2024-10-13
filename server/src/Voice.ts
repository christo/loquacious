type Voice = {
  name: string;
  speak: (message: string) => void;
}

class NoVoice implements Voice {
  name = "no voice";
  speak(message: string): void {
  }
}

export type {Voice}