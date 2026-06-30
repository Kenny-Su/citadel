import type { AppId } from '../shared/platform.js';
import type { CitadelDatabase } from '../persistence/sqlite.js';
import type { ChatRepository, MessageStore } from './chat/messageStore.js';
import type { ChessRepository } from './chess/repository.js';

export type ChatRateLimitOptions = {
  maxMessages: number;
  windowMs: number;
};

export type ServerAppServices = {
  database: CitadelDatabase;
  chatRepository?: ChatRepository;
  chessRepository?: ChessRepository;
  messageStore?: MessageStore;
  messageRateLimit?: ChatRateLimitOptions;
  enabledAppIds?: AppId[];
};
