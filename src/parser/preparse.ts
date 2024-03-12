import { isAlias, isOption } from '../utils/arg.utils';
import { Parsed } from './parser.types';

export function preparse(arg: string): Parsed[] {
  const parsed: Parsed[] = [];
  let equalIndex: number;
  const minIndex = isAlias(arg) ? 1 : isOption(arg) ? 2 : null;
  // for alias and options, check for equal sign
  if (minIndex !== null && (equalIndex = arg.indexOf('=')) > minIndex) {
    // if found, split arg and treat 2nd part as value
    // allow empty string value
    const alias = arg.slice(0, equalIndex);
    const value = arg.slice(equalIndex + 1);
    // for some reason, enclosing quotes are not included
    // with the value part, so there's no need to handle them
    parsed.push({ arg: alias }, { arg: value, raw: true });
  } else {
    // maybe value or command, ignore equal sign
    // treat as an arg without splitting `=` if ever it exists
    parsed.push({ arg });
  }
  return parsed;
}
