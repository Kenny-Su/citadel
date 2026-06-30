import { MESSAGE_MAX_LENGTH } from './shared.js';
import type { ValidationResult } from '../../platform/validation.js';

export function validateMessageBody(input: unknown): ValidationResult {
  if (typeof input !== 'string') {
    return { ok: false, error: 'Type a message before sending.' };
  }

  const value = input.trim();

  if (!value) {
    return { ok: false, error: 'Type a message before sending.' };
  }

  if (value.length > MESSAGE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Messages must be ${MESSAGE_MAX_LENGTH} characters or fewer.`
    };
  }

  return { ok: true, value };
}
