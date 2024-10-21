/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // origin of a generated asset or state transition, could be captured from camera or mic,
  // text from user input etc. or could be the output of an ai component or a system effect
  pgm.createTable('creator', {
    id: 'id',
    name: {
      type: 'varchar(64)',
      notNull: true,
    },
    // put metadata about the origin
    metadata: 'text',
  });
  pgm.createTable('deployment', {
    id: 'id',
    created: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    name: {
      type: 'varchar(64)',
      notNull: true,
    },
    metadata: 'text',
  });
  pgm.createTable('run', {
    id: 'id',
    created: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    name: {
      type: 'varchar(64)',
      notNull: true,
    },
    metadata: 'text',
    sha1: {
      type: 'varchar(40)',
    },
    deployment: {
      type: 'integer',
      notNull: true,
      references: '"deployment"',
      onDelete: 'CASCADE'
    }
  });
  pgm.createTable('session', {
    id: 'id',
    created: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    finished: {
      type: 'timestamp',
    },
    run: {
      type: 'integer',
      notNull: true,
      references: '"run"',
      onDelete: 'CASCADE'
    }
  });
  pgm.createTable('video', {
    id: 'id',
    duration_ms: {
      type: 'integer',
      notNull: true
    },
    mime_type: {
      type: 'varchar(64)',
      notNull: true
    },
    created: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    creator: {
      type: 'integer',
      notNull: true,
      references: '"creator"',
      onDelete: 'CASCADE',
    }
  });
  pgm.createTable('audio', {
    id: 'id',
    created: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    duration_ms: {
      type: 'integer',
      notNull: true
    },
    mime_type: {
      type: 'varchar(64)',
      notNull: true
    },
    creator: {
      type: 'integer',
      notNull: true,
      references: '"creator"',
      onDelete: 'CASCADE',
    }
  });
  pgm.createTable('template', {
    id: 'id',
    created: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    name: {
      type: 'varchar(64)',
      notNull: true,
      unique: true,
    },
    description: 'text',
    content: {
      type: 'text',
      notNull: true,
    },
    syntax: {
      type: 'varchar(64)',
      notNull: true,
    }
  });
  pgm.createTable('template_param', {
    id: 'id',
    name: {
      type: 'varchar(64)',
      notNull: true,
    },
    content: {
      type: 'text',
      notNull: true,
    },
    function: {
      type: 'varchar(64)',
      notNull: true,
    },
    template: {
      type: 'integer',
      notNull: true,
      references: '"template"',
      onDelete: 'CASCADE'
    }
  });
  pgm.createTable('message', {
    id: 'id',
    created: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    content: {
      type: 'text',
      notNull: true,
    },
    session: {
      type: 'integer',
      notNull: true,
      references: '"session"',
      onDelete: 'CASCADE'
    },
    creator: {
      type: 'integer',
      notNull: true,
      references: '"creator"',
      onDelete: 'CASCADE'
    },
    sequence: {
      type: 'integer',
      notNull: true,
    }
  });
  pgm.createTable('mode', {
    id: 'id',
    name: {
      type: 'varchar(64)',
      notNull: true,
      unique: true,
    },
  });
  pgm.createTable('trans', {
    id: 'id',
    created: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    from: {
      type: 'integer',
      notNull: true,
      references: '"mode"',
      onDelete: 'CASCADE'
    },
    to: {
      type: 'integer',
      notNull: true,
      references: '"mode"',
      onDelete: 'CASCADE'
    },
    reason: {
      type: 'varchar(64)',
    },
    session: {
      type: 'integer',
      notNull: true,
      references: '"session"',
      onDelete: 'CASCADE'
    },
    creator: {
      type: 'integer',
      notNull: true,
      references: '"creator"',
      onDelete: 'CASCADE'
    },
  });
  pgm.createTable('tts', {
    id: 'id',
    created: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    creator: {
      type: 'integer',
      notNull: true,
      references: '"creator"',
      onDelete: 'CASCADE',
    },
    input: {
      type: 'integer',
      notNull: true,
      references: '"message"',
      onDelete: 'CASCADE'
    },
    output: {
      type: 'integer',
      notNull: true,
      references: '"audio"',
      onDelete: 'CASCADE'
    }
  });
  pgm.createTable('lipsync', {
    id: 'id',
    created: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    creator: {
      type: 'integer',
      notNull: true,
      references: '"creator"',
      onDelete: 'CASCADE'
    },
    input: {
      type: 'integer',
      notNull: true,
      references: '"audio"',
      onDelete: 'CASCADE'
    },
    output: {
      type: 'integer',
      notNull: true,
      references: '"video"',
      onDelete: 'CASCADE'
    }
  });
  pgm.createTable('stt', {
    id: 'id',
    created: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    creator: {
      type: 'integer',
      notNull: true,
      references: '"creator"',
      onDelete: 'CASCADE',
    },
    input: {
      type: 'integer',
      notNull: true,
      references: '"audio"',
      onDelete: 'CASCADE'
    },
    output: {
      type: 'integer',
      notNull: true,
      references: '"message"',
      onDelete: 'CASCADE'
    }
  });

  pgm.createTable('perf', {
    id: 'id',
    created: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    name: {
      type: 'varchar(64)',
      notNull: true,
    },
    creator: {
      type: 'integer',
      notNull: true,
      references: '"creator"',
      onDelete: 'CASCADE'
    },
    duration_ms: {
      type: 'integer',
      notNull: true,
    }
  });

}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('perf');
  pgm.dropTable('stt');
  pgm.dropTable('lipsync');
  pgm.dropTable('tts');
  pgm.dropTable('trans');
  pgm.dropTable('mode');
  pgm.dropTable('message');
  pgm.dropTable('template_param');
  pgm.dropTable('template');
  pgm.dropTable('audio');
  pgm.dropTable('video');
  pgm.dropTable('session');
  pgm.dropTable('run');
  pgm.dropTable('deployment');
  pgm.dropTable('creator');
}
