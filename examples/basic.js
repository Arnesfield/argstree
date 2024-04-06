import { spec } from '../lib/index.js';

function help() {
  console.log(
    'Usage: node examples/basic.js hello --opt value --list a,b,c --no-bool -- -a -b'
  );
  process.exit(0);
}

try {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    help();
  } else {
    run(args);
  }
} catch (error) {
  console.error(error + '');
  process.exitCode = 1;
}

/** @param {string[]} args */
function run(args) {
  const cmd = spec()
    .command('--')
    .option('--help', { maxRead: 0, validate: help })
    .alias('-h')
    .args((arg, data) => {
      // ignore anything from alias
      const { alias } = data.options;
      if (
        (alias && arg in alias) ||
        !arg.startsWith('-') ||
        arg.includes('=')
      ) {
        return;
      }
      // get index to slice off hyphens
      const start =
        arg.length > 1 && arg[1] !== '-'
          ? 1
          : arg.length > 2 && arg.startsWith('--') && arg[2] !== '-'
            ? 2
            : null;
      if (start !== null) {
        return { id: arg.slice(start) };
      }
    });

  const root = cmd.parse(args);
  const object = { __proto__: null, _: root.args.slice() };
  for (const node of root.children) {
    const { args } = node;
    const id = camelCase(node.id);
    if (node.id === '--' || id === '_') {
      // handle positional args
      object._.push(...args);
    } else if (args.length === 0) {
      // handle boolean
      const match = 'no-';
      const negate = node.id.startsWith(match);
      const prop = camelCase(negate ? node.id.slice(match.length) : node.id);
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

// naive camelCase transform
/** @param {string | null} id  */
function camelCase(id) {
  if (typeof id !== 'string') {
    return id;
  }
  const value = id
    .split('-')
    .map(part => {
      return part.length === 0 ? part : part[0].toUpperCase() + part.slice(1);
    })
    .join('')
    .trim();
  return value.length > 0 ? value[0].toLowerCase() + value.slice(1) : value;
}
