// @ts-check
import { command, isAlias, isOption, option } from '../lib/index.js';

/** @returns {never} */
function help() {
  console.log(
    'Usage: node examples/parse.js hello --option 1.23 world --no-bool -abc 4 --x.y.z 5 -- -a -b 6'
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

/** @param {string[]} argv */
function run(argv) {
  const negatePrefix = 'no-';

  const cmd = command({
    handler(arg) {
      if (isAlias(arg.key)) {
        return arg.key
          .slice(1)
          .split('')
          .map((id, index, array) => {
            // only apply args for the last option
            const args =
              index === array.length - 1 && arg.value != null
                ? [arg.value]
                : [];
            return option({ id, name: id, args, max: 1 });
          });
      } else if (isOption(arg.key)) {
        // for option ids, remove first 2 hyphens
        const id = arg.key.replace(/^--?/, '');
        return option({
          id,
          args: arg.value != null ? [arg.value] : [],
          max: 1,
          // for options starting with --no-*, stop accepting args
          maxRead: id.startsWith(negatePrefix) ? 0 : null
        });
      }
    }
  });

  const root = cmd
    .option('--help', { alias: '-h', preArgs: help })
    .command('--', { strict: false })
    .parse(argv);

  const result = { __proto__: null, _: [] };

  /**
   * @param {Record<string, any>} object
   * @param {string} key
   * @param {unknown} value
   */
  function set(object, key, value) {
    const curr = object[key];
    if (Array.isArray(curr)) {
      const array = Array.isArray(value) ? value : [value];
      curr.push(...array);
    } else {
      // set new value or replace existing boolean, otherwise append to array
      object[key] =
        curr == null ||
        (typeof curr === 'boolean' && typeof value === 'boolean')
          ? value
          : [curr].concat(value);
    }
  }

  for (const node of root.children) {
    // skip value nodes except the root node
    if (node.type === 'value' && node.id !== root.id) continue;

    const id = node.id || '_';
    const props = id === '.' ? [id] : id.split('.');
    const last = props.pop();
    if (last == null) continue;

    // get nested object
    let obj = result;
    for (const prop of props) {
      if (!(prop in obj)) {
        obj = obj[prop] = Object.create(null);
      } else if (Array.isArray(obj[prop])) {
        obj[prop].push((obj = Object.create(null)));
      } else if (typeof obj[prop] === 'object' && obj[prop] !== null) {
        obj = obj[prop];
      }
    }

    // set value
    const { args } = node;
    if (last === '--') {
      // handle unformatted args
      set(obj, '_', args);
    } else if (args.length > 0) {
      // handle numbers and strings
      const values = args.map(arg => {
        // check and parse if number
        const n = Number(arg);
        return isNaN(n) ? arg : n;
      });
      set(obj, last, values.length === 1 ? values[0] : values);
    } else {
      // handle booleans (args.length === 0)
      const negate = last.startsWith(negatePrefix);
      const key = negate ? last.slice(negatePrefix.length) : last;
      set(obj, key, !negate);
    }
  }

  // remove null prototype from log
  const object = JSON.parse(JSON.stringify(result));
  console.dir(object, { depth: null });
}
