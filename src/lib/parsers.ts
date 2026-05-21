import { Parser as ParserClass } from '../parser/parser';
import { Options } from '../types/options.types';
import { Parser } from '../types/parser.types';

/**
 * Creates a parser.
 * @param options The parser options.
 * @returns The parser object.
 */
export function parser<T>(options: Options<T> = {}): Parser<T> {
  return new ParserClass({ options });
}
