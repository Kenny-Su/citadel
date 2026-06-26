import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DEFAULT_SPACE_ID } from '../../shared/platform.js';
import { MESSAGE_HISTORY_LIMIT, type ChatMessage } from './shared.js';

export type MessageStore = {
  listRecentMessages(spaceId: string, limit?: number): ChatMessage[];
  saveMessage(message: ChatMessage): void;
  countMessages(): number;
  close(): void;
};

type MessageRow = {
  id: string;
  space_id: string;
  participant_id: string;
  participant_name: string;
  body: string;
  created_at: string;
};

export function createSqliteMessageStore(dbPath: string): MessageStore {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const database = new DatabaseSync(dbPath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      space_id TEXT NOT NULL DEFAULT '${DEFAULT_SPACE_ID}',
      participant_id TEXT NOT NULL,
      participant_name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

  `);

  const columns = database.prepare('PRAGMA table_info(messages)').all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((column) => column.name));

  if (columnNames.has('room_id') && !columnNames.has('space_id')) {
    database.exec(`ALTER TABLE messages RENAME COLUMN room_id TO space_id`);
  }

  if (columnNames.has('user_id') && !columnNames.has('participant_id')) {
    database.exec(`ALTER TABLE messages RENAME COLUMN user_id TO participant_id`);
  }

  if (columnNames.has('user_name') && !columnNames.has('participant_name')) {
    database.exec(`ALTER TABLE messages RENAME COLUMN user_name TO participant_name`);
  }

  const migratedColumns = database.prepare('PRAGMA table_info(messages)').all() as Array<{ name: string }>;
  const migratedNames = new Set(migratedColumns.map((column) => column.name));

  if (!migratedNames.has('space_id')) {
    database.exec(`ALTER TABLE messages ADD COLUMN space_id TEXT NOT NULL DEFAULT '${DEFAULT_SPACE_ID}'`);
  }

  database.exec('CREATE INDEX IF NOT EXISTS idx_messages_space_created_at ON messages (space_id, created_at)');

  const listRecent = database.prepare(`
    SELECT id, space_id, participant_id, participant_name, body, created_at
    FROM (
      SELECT id, space_id, participant_id, participant_name, body, created_at
      FROM messages
      WHERE space_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    )
    ORDER BY created_at ASC, id ASC
  `);

  const save = database.prepare(`
    INSERT INTO messages (id, space_id, participant_id, participant_name, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const count = database.prepare('SELECT COUNT(*) AS count FROM messages');

  return {
    listRecentMessages(spaceId, limit = MESSAGE_HISTORY_LIMIT) {
      return listRecent.all(spaceId, limit).map(rowToMessage);
    },
    saveMessage(message) {
      save.run(
        message.id,
        message.spaceId,
        message.participantId,
        message.participantName,
        message.body,
        message.createdAt
      );
    },
    countMessages() {
      const row = count.get() as { count: number };
      return row.count;
    },
    close() {
      database.close();
    }
  };
}

function rowToMessage(row: unknown): ChatMessage {
  const message = row as MessageRow;

  return {
    id: message.id,
    spaceId: message.space_id,
    participantId: message.participant_id,
    participantName: message.participant_name,
    body: message.body,
    createdAt: message.created_at
  };
}
