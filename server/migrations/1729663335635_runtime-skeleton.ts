/* eslint-disable @typescript-eslint/naming-convention */
import {ColumnDefinitions, MigrationBuilder} from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('run', ['name']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('run', {
    name: {
      type: 'varchar(64)',
      notNull: true,
    }
  });
}
