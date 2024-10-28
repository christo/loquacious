/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addConstraint('message', 'session_sequence', 'unique (session, sequence)');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('message', 'session_sequence');
}
