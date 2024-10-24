export class Creator {
  id: number;
  name: string;
  metadata: string;

  constructor(id: number, name: string, metadata: string) {
    this.id = id;
    this.name = name;
    this.metadata = metadata;
  }
}