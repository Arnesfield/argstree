import { Options } from '../core/core.types.js';
import { isOption } from './arg.utils.js';

export function getId(raw: string | null, id: Options['id']): string | null {
  return (typeof id === 'function' ? id(raw) : id) ?? raw ?? null;
}

export function getType(raw: string | null): string {
  return raw && isOption(raw) ? 'Option' : 'Command';
}

export function displayName(raw: string | null, name?: string | null): string {
  name ??= raw ?? null;
  return name == null ? '' : `${getType(raw)} '${name}' `;
}
