import type React from 'react';
import type { AppEventEnvelope, AppId, Participant } from '../shared/platform';
import type { ChatState } from '../apps/chat/shared';
import type { ChessState } from '../apps/chess/shared';
import type { SnakeState } from '../apps/snake/shared';
import { chatClientApp } from '../apps/chat/client';
import { chessClientApp } from '../apps/chess/client';
import { snakeClientApp } from '../apps/snake/client';

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

export const clientApps = [chatClientApp, chessClientApp, snakeClientApp] satisfies ClientAppModule<any>[];

export const appById = new Map<AppId, ClientAppModule<any>>(clientApps.map((app) => [app.appId, app]));

export type KnownAppState = ChatState | ChessState | SnakeState;

export function isKnownAppEvent(event: unknown): event is AppEventEnvelope {
  return Boolean(event && typeof event === 'object' && 'appId' in event && 'type' in event);
}
