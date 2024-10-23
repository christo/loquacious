
export class Deployment {
  id: number;
  created: Date;
  name: string;
  metadata: string;

  constructor(id: number, created: Date, name: string, metadata: string) {
    this.id = id;
    this.created = created;
    this.name = name;
    this.metadata = metadata;
  }
}