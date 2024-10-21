/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`insert into deployment (name, metadata)
    values ('devmode', 'generic development mode'),
           ('integration-test', 'basic integration test')`);
  pgm.sql(`insert into creator (name) values ('user')`);
  pgm.sql(`insert into mode (name) 
    values ('boot'),
         ('warmup'),
         ('attract'),
         ('invite'),
         ('introduce'),
         ('chat'),
         ('interrupt'),
         ('goodbye'),
         ('sleep')
    `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('delete from creator');
  pgm.sql('delete from deployment');
  pgm.sql('delete from mode');
}
