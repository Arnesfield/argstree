import { Parser as ParserClass } from '../parser/parser';
import { Options } from '../types/options.types';
import { Parser } from '../types/parser.types';

/**
 * Creates an option parser.
 * @param options The parser options.
 * @returns The parser object.
 */
export function option<T>(options: Options<T> = {}): Parser<T> {
  return new ParserClass({ type: 'option', options });
}

/**
 * Creates a command parser.
 * @param options The parser options.
 * @returns The parser object.
 */
export function command<T>(options: Options<T> = {}): Parser<T> {
  return new ParserClass({ type: 'command', options });
}
