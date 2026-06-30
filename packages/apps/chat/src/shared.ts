import type { Participant } from '@citadel/platform/app';

export const MESSAGE_MAX_LENGTH = 500;
export const MESSAGE_HISTORY_LIMIT = 100;

export type ChatMessage = {
  id: string;
  spaceId: string;
  participantId: string;
  participantName: string;
  body: string;
  createdAt: string;
};

export type ChatSystemEvent = {
  id: string;
  type: 'participant:joined' | 'participant:left';
  participant: Participant;
  createdAt: string;
};

export type ChatTimelineItem =
  | ({ kind: 'message' } & ChatMessage)
  | ({ kind: 'system' } & ChatSystemEvent);

export type ChatState = {
  messages: ChatMessage[];
  typingParticipants: Participant[];
};

export type SendMessagePayload = {
  body: string;
};

export type TypingUpdatePayload = {
  spaceId: string;
  participants: Participant[];
};
