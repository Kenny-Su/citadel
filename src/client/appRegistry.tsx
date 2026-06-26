import type React from 'react';
import type { AppEventEnvelope, AppId, Participant } from '../shared/platform';
import type { ChatState } from '../apps/chat/shared';
import { ChatView } from '../apps/chat/ChatView';
import type { ChessState } from '../apps/chess/shared';
import { ChessView } from '../apps/chess/ChessView';
import type { SnakeState } from '../apps/snake/shared';
import { SnakeView } from '../apps/snake/SnakeView';

export type AppViewProps<TState = unknown> = {
  currentParticipant: Participant;
  spaceId: string;
  participants: Participant[];
  appState: TState;
  sendAppEvent(type: string, payload?: unknown): void;
  setNotice(message: string): void;
};

export type ClientAppModule<TState = unknown> = {
  appId: AppId;
  label: string;
  defaultSpaceId: string;
  View: React.ComponentType<AppViewProps<TState>>;
};

export const clientApps = [
  {
    appId: 'chat',
    label: 'Chat',
    defaultSpaceId: 'general',
    View: ChatView
  },
  {
    appId: 'chess',
    label: 'Chess',
    defaultSpaceId: 'general',
    View: ChessView
  },
  {
    appId: 'snake',
    label: 'Snake',
    defaultSpaceId: 'general',
    View: SnakeView
  }
] satisfies ClientAppModule<any>[];

export const appById = new Map<AppId, ClientAppModule<any>>(clientApps.map((app) => [app.appId, app]));

export type KnownAppState = ChatState | ChessState | SnakeState;

export function isKnownAppEvent(event: unknown): event is AppEventEnvelope {
  return Boolean(event && typeof event === 'object' && 'appId' in event && 'type' in event);
}
