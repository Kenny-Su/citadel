import {
  resolveChatRepository,
  type ChatRepository,
  type MessageStore
} from '@citadel/app-chat/server';
import {
  resolveChessRepository,
  type ChessRepository
} from '@citadel/app-chess/server';
import type { CitadelDatabase } from '@citadel/platform/persistence';

export type LegacyAppRepositoryOptions = {
  database: CitadelDatabase;
  chatRepository?: ChatRepository;
  chessRepository?: ChessRepository;
  messageStore?: MessageStore;
};

export type LegacyAppRepositories = {
  chatRepository: ChatRepository;
  chessRepository: ChessRepository;
  messageStore: MessageStore;
};

export type {
  ChatRepository,
  ChessRepository,
  MessageStore
};

export function resolveLegacyAppRepositories(options: LegacyAppRepositoryOptions): LegacyAppRepositories {
  const chatRepository = resolveChatRepository(options);
  const chessRepository = resolveChessRepository(options);

  return {
    chatRepository,
    chessRepository,
    messageStore: chatRepository
  };
}
