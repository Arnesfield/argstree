import { Options } from './core.types.js';
import { Spec } from './spec.class.js';
import { Spec as ISpec } from './spec.types.js';

export function command(options?: Options): ISpec {
  return new Spec('command', options);
}

export function option(options?: Options): ISpec {
  return new Spec('option', options);
}

// TODO: remove
const k = command()
  .aliases({ a: ['a'] })
  .option('--option', { alias: '-o' })
  .option('--option2', {
    alias: ['-o2', '-o5', '1'],
    spec(spec) {
      console.log('spec', spec);
    }
  })
  .option('--option3', {
    alias: [['-o3', 'arg', '1']],
    args(arg, data) {
      console.log(arg, data);
    },
    spec(spec) {
      console.log('spec', spec);
    }
  });
console.log(k, k.parse([]), command().parse([]));
