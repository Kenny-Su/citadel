import { Chess } from 'chess.js';
import type { Participant } from '../../shared/platform.js';
import type { ServerAppModule } from '../../platform/server.js';
import type { ChessColor, ChessMovePayload, ChessState } from './shared.js';

type ChessSpaceState = {
  game: Chess;
  players: {
    white?: string;
    black?: string;
  };
};

function getOrCreateState(context: Parameters<ServerAppModule['getInitialState']>[0]) {
  const existing = context.getAppState<ChessSpaceState>();

  if (existing) {
    return existing;
  }

  const state: ChessSpaceState = {
    game: new Chess(),
    players: {}
  };
  context.setAppState(state);
  return state;
}

function assignPlayers(state: ChessSpaceState, participants: Participant[]) {
  const participantIds = new Set(participants.map((participant) => participant.id));

  if (state.players.white && !participantIds.has(state.players.white)) {
    state.players.white = undefined;
  }

  if (state.players.black && !participantIds.has(state.players.black)) {
    state.players.black = undefined;
  }

  for (const participant of participants) {
    if (!state.players.white) {
      state.players.white = participant.id;
      continue;
    }

    if (!state.players.black && state.players.white !== participant.id) {
      state.players.black = participant.id;
    }
  }
}

function toClientState(state: ChessSpaceState): ChessState {
  const turn: ChessColor = state.game.turn() === 'w' ? 'white' : 'black';
  let status = `${turn} to move`;

  if (state.game.isCheckmate()) {
    status = `checkmate: ${turn === 'white' ? 'black' : 'white'} wins`;
  } else if (state.game.isDraw()) {
    status = 'draw';
  } else if (state.game.isCheck()) {
    status = `${turn} is in check`;
  }

  return {
    fen: state.game.fen(),
    turn,
    players: state.players,
    status,
    pgn: state.game.pgn()
  };
}

function colorForParticipant(state: ChessSpaceState, participantId: string): ChessColor | null {
  if (state.players.white === participantId) {
    return 'white';
  }

  if (state.players.black === participantId) {
    return 'black';
  }

  return null;
}

export function createChessApp(): ServerAppModule {
  return {
    appId: 'chess',
    getInitialState(context) {
      const state = getOrCreateState(context);
      assignPlayers(state, context.participants);
      return toClientState(state);
    },
    handleEvent(context, event) {
      const state = getOrCreateState(context);
      assignPlayers(state, context.participants);

      if (event.type !== 'chess:move') {
        return;
      }

      const color = colorForParticipant(state, context.participant.id);

      if (!color) {
        context.emitToParticipant('chess:notice', { message: 'Spectators cannot move pieces.' });
        return;
      }

      if ((state.game.turn() === 'w' ? 'white' : 'black') !== color) {
        context.emitToParticipant('chess:notice', { message: 'Wait for your turn.' });
        return;
      }

      const payload = (event.payload ?? {}) as ChessMovePayload;
      const move = state.game.move({
        from: payload.from,
        to: payload.to,
        promotion: payload.promotion ?? 'q'
      });

      if (!move) {
        context.emitToParticipant('chess:notice', { message: 'Illegal move.' });
        return;
      }

      context.emitToSpace('chess:state', toClientState(state));
      context.emitSpaceState();
    },
    onParticipantJoined(context) {
      const state = getOrCreateState(context);
      assignPlayers(state, context.participants);
    },
    onParticipantLeft(context) {
      const state = getOrCreateState(context);
      assignPlayers(state, context.participants);
      context.emitToSpace('chess:state', toClientState(state));
    }
  };
}
