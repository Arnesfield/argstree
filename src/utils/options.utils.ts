import { Options } from '../core/core.types.js';

// no need the same complicated check for hasArgs
export function displayName(
  raw: string | null,
  options: Options,
  hasArgs = options.args != null
): string {
  const name = options.name ?? raw ?? null;
  const type = hasArgs ? 'Command' : 'Option';
  return name === null ? '' : `${type} '${name}' `;
}

export function getId(raw: string | null, id: Options['id']): string | null {
  return (typeof id === 'function' ? id(raw) : id) ?? raw ?? null;
}
