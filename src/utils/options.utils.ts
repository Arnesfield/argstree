import { isOption } from './arg.utils.js';

export function getType(raw: string | null): string {
  return raw && isOption(raw) ? 'Option' : 'Command';
}

export function displayName(raw: string | null, name?: string | null): string {
  name ??= raw ?? null;
  return name === null ? '' : `${getType(raw)} '${name}' `;
}
