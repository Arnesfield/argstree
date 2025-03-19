// @ts-check
import { command, isOption, option } from '../lib/index.js';

/** @returns {never} */
function help() {
  console.log(
    'Usage: node examples/basic.js hello --opt value --list a,b,c --no-bool -- -a -b'
  );
  process.exit();
}

try {
  const args = process.argv.slice(2);
  args.length > 0 ? run(args) : help();
} catch (error) {
  console.error(error + '');
  process.exitCode = 1;
}

/** @param {string[]} args */
function run(args) {
  const cmd = command({
    handler(arg) {
      if (isOption(arg.key)) {
        return option({
          id: arg.key.replace(/^--?/, ''),
          args: arg.value != null ? [arg.value] : []
        });
      }
    }
  })
    .option('--help', { alias: '-h', maxRead: 0, preParse: help })
    .command('--', { strict: false });

  const root = cmd.parse(args);
  const object = { __proto__: null, _: root.args.slice() };
  for (const node of root.children) {
    const { args } = node;
    const nodeId = node.id || '';
    const id = camelCase(nodeId);

    if (nodeId === '--' || id === '_') {
      // handle positional args
      object._.push(...args);
    } else if (args.length === 0) {
      // handle boolean
      const match = 'no-';
      const negate = nodeId.startsWith(match);
      const prop = camelCase(negate ? nodeId.slice(match.length) : nodeId);
      object[prop] = !negate;
    } else if (args.length === 1 && args[0].includes(',')) {
      // handle comma separated values
      const array = (object[id] = Array.isArray(object[id]) ? object[id] : []);
      array.push(...args[0].split(','));
    } else {
      // handle multiple args and single values
      object[id] = args.length > 1 ? args.slice() : args[0];
    }
  }

  console.log(JSON.stringify(object, undefined, 2));
}

/**
 * @param {string} value
 * @param {(firstChar: string) => string} char
 */
function map(value, char) {
  return value.length > 0 ? char(value[0]) + value.slice(1) : value;
}

// naive camelCase transform
/** @param {string } id  */
function camelCase(id) {
  const value = id
    .split('-')
    .map(part => map(part, c => c.toUpperCase()))
    .join('')
    .trim();
  return map(value, c => c.toLowerCase());
}
