type BackEnd = {
  name: string,
  baseUrl: string | undefined,
  enableHealth: boolean,
  models: () => Promise<Array<string>>
}

export type {BackEnd};
