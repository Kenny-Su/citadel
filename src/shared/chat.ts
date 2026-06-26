export {
  DISPLAY_NAME_MAX_LENGTH,
  DEFAULT_SPACE_ID as DEFAULT_ROOM_ID,
  SPACE_ID_MAX_LENGTH as ROOM_ID_MAX_LENGTH,
  SPACE_ID_PATTERN as ROOM_ID_PATTERN,
  normalizeSpaceId as normalizeRoomId,
  type Participant as User,
  type PlatformErrorPayload as ServerErrorPayload
} from './platform.js';
export {
  MESSAGE_MAX_LENGTH,
  MESSAGE_HISTORY_LIMIT,
  type ChatMessage,
  type ChatSystemEvent as SystemEvent,
  type ChatTimelineItem as TimelineItem,
  type SendMessagePayload,
  type TypingUpdatePayload
} from '../apps/chat/shared.js';
