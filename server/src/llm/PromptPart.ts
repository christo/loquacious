/**
 * Thin wrapper around prompt text.
 */
export type PromptPart = {
  text: () => string;
}

export class SimplePromptPart implements PromptPart {
  private readonly _text: string;

  constructor(text: string) {
    this._text = text;
  }

  text(): string {
    return this._text;
  }
}
