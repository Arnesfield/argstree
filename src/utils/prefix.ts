// NOTE: taken from:
// - https://github.com/megahertz/howfat
// - https://github.com/megahertz/howfat/blob/master/src/reporters/Tree.js

export interface PrefixOptions {
  prefix?: string;
  first?: boolean;
  last?: boolean;
  next?: boolean;
}

export function self(options: PrefixOptions): string {
  return options.first
    ? ''
    : (options.prefix || '') +
        (options.last ? '└─' : '├─') +
        (options.next ? '┬' : '─') +
        ' ';
}

export function child(options: PrefixOptions): string {
  return options.first
    ? ''
    : (options.prefix || '') + (options.last ? '  ' : '│ ');
}
