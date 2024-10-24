

// TODO read about types:
//  * parser https://node-postgres.com/features/queries#types
//  *  https://github.com/brianc/node-pg-types
//  * https://node-postgres.com/features/types#strings-by-default
//  *  https://node-postgres.com/features/types

export type Persistent<T> = {
  id: number;
  toPostgres (prepareValue: (value: T) => any): any
}