import type { ComponentType } from 'react';
import type { AppEventEnvelope, AppId, Participant } from '../shared/platform.js';

export type AppManifest = {
  appId: AppId;
  label: string;
  defaultSpaceId: string;
  persistence: 'none' | 'sqlite';
  version: string;
};

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
  View: ComponentType<AppViewProps<TState>>;
};

export type ServerAppContext = {
  appId: AppId;
  spaceId: string;
  socketId: string;
  participant: Participant;
  participants: Participant[];
  emitToSpace(type: string, payload?: unknown): void;
  emitToParticipant(type: string, payload?: unknown): void;
  emitSpaceState(): void;
  getAppState<T>(): T | undefined;
  setAppState<T>(state: T): void;
  clearAppState(): void;
};

export type ServerAppModule = {
  appId: AppId;
  getInitialState(context: Omit<ServerAppContext, 'participant' | 'socketId'>): unknown;
  handleEvent(context: ServerAppContext, event: AppEventEnvelope): void;
  onParticipantJoined?(context: ServerAppContext): void;
  onParticipantLeft?(context: ServerAppContext): void;
};

export type ServerAppBundle<TServices> = {
  appId: AppId;
  createServerApp(services: TServices): ServerAppModule;
};
