export type { AppManifest } from './appContract.js';
export {
  DEFAULT_SPACE_ID,
  DISPLAY_NAME_MAX_LENGTH,
  GUEST_ID_MAX_LENGTH,
  GUEST_ID_PATTERN,
  SPACE_ID_MAX_LENGTH,
  SPACE_ID_PATTERN,
  isAppId,
  normalizeGuestId,
  normalizeSpaceId,
  type AppEventEnvelope,
  type AppId,
  type JoinSpacePayload,
  type Participant,
  type ParticipantEvent,
  type PlatformErrorPayload,
  type SpaceState
} from '../../../src/shared/platform.js';
export type { ValidationResult } from './validation.js';
