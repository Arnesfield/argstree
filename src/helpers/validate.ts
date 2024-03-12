import { Node } from '../node/node';
import { isAlias } from '../utils/arg.utils';
import { pluralize } from '../utils/pluralize';

export class Validate {
  error(error: unknown): void {
    // TODO: update error handling
    throw error;
  }

  options(node: Node): void {
    try {
      node.validateOptions();
    } catch (error) {
      this.error(error);
    }
  }

  range(node: Node): void {
    try {
      node.validateRange();
    } catch (error) {
      this.error(error);
    }
  }

  unknown(arg: string): void {
    // NOTE: only use validateUnknown for left over alias split arg
    if (!isAlias(arg)) {
      return;
    }
    const aliases = Array.from(new Set(arg.trim().slice(1).split('')));
    const label = pluralize('alias', aliases.length, 'es');
    const list = aliases.map(alias => '-' + alias).join(', ');
    this.error(new Error(`Unknown ${label}: ${list}.`));
  }
}
