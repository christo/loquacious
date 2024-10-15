export class CharacterVoice {
  voiceId: string;
  name: string;
  description: string;

  constructor(voiceId: string, name: string, description: string) {
    this.name = name;
    this.voiceId = voiceId;
    this.description = description;
  }
}