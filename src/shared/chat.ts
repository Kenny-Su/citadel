export const DISPLAY_NAME_MAX_LENGTH = 24;
export const MESSAGE_MAX_LENGTH = 500;
export const MESSAGE_HISTORY_LIMIT = 100;

export type User = {
  id: string;
  name: string;
};

export type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string;
};

export type SystemEvent = {
  id: string;
  type: 'user:joined' | 'user:left';
  user: User;
  createdAt: string;
};

export type TimelineItem =
  | ({ kind: 'message' } & ChatMessage)
  | ({ kind: 'system' } & SystemEvent);

export type RoomState = {
  users: User[];
  messages: ChatMessage[];
};

export type JoinPayload = {
  name: string;
};

export type SendMessagePayload = {
  body: string;
};

export type ServerErrorPayload = {
  message: string;
};
