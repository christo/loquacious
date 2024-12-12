export type Persistent<T> = {
  id: number;
  /**
   *
   * @param prepareValue
   */
  toPostgres(prepareValue: (value: T) => any): any
}