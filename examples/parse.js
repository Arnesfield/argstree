// @ts-check
import { command, isAlias, isOption, option } from '../lib/index.js';

/** @returns {never} */
function help() {
  console.log(
    'Usage: node examples/parse.js ' +
      'hello --num 3.14 world --no-bool -abc 15 --x.y.z 92 -- -a -b 65'
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
        // treat negative numbers as values
        if (!isNaN(Number(arg.key))) {
          return arg.key;
        }

        // each character becomes its own option
        return arg.key
          .slice(1)
          .split('')
          .map((id, index, array) => {
            // apply the value for the last option
            const args = index === array.length - 1 ? arg.value : undefined;
            return option({ id, name: id, max: 1, args });
          });
      } else if (isOption(arg.key)) {
        // for option ids, remove first 2 hyphens
        const id = arg.key.replace(/^--?/, '');
        // for options starting with --no-*, stop reading args
        const read = !id.startsWith(negatePrefix);
        return option({ id, max: 1, args: arg.value, read });
      }
    }
  });

  const root = cmd
    .option('--help', { alias: '-h', assign: false, preArgs: help })
    .command('--', { strict: false })
    .parse(argv);

  /** @type {Record<string, unknown> & { __proto__: null, _: unknown[] }} */
  const result = { __proto__: null, _: [] };

  /**
   * @param {Record<string, unknown>} object
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
          : /** @type {unknown[]} */ ([curr]).concat(value);
    }
  }

  for (const node of root.children) {
    const id = node.id || '_';
    const props = id === '.' ? [id] : id.split('.');
    const last = props.pop();
    if (last == null) continue;

    // get nested object
    /** @type {Record<string, unknown>} */
    let obj = result;
    for (const prop of props) {
      if (obj[prop] === undefined) {
        obj = obj[prop] = Object.create(null);
      } else if (Array.isArray(obj[prop])) {
        obj[prop].push((obj = Object.create(null)));
      } else if (typeof obj[prop] === 'object' && obj[prop] !== null) {
        obj = /** @type {Record<string, unknown>} */ (obj[prop]);
      } else {
        obj[prop] = [obj[prop], (obj = Object.create(null))];
      }
    }

    // set value
    const { args } = node;
    if (props.length === 0 && last === '--') {
      // handle unformatted args
      set(obj, '_', args);
    } else if (args.length > 0) {
      // handle numbers and strings
      const values = args.map(arg => {
        // check and parse if number
        let n;
        return arg.trim() && !isNaN((n = Number(arg))) ? n : arg;
      });
      set(obj, last, values.length === 1 ? values[0] : values);
    } else {
      // handle booleans (args.length === 0)
      const negate = last.startsWith(negatePrefix);
      const key = negate ? last.slice(negatePrefix.length) : last;
      set(obj, key, !negate);
    }
  }

  /**
   * Recursively resets object prototype
   * to hide `[Object: null prototype]` from logs.
   * @param {unknown} value The object to reset the prototype of.
   */
  function resetPrototype(value) {
    if (Array.isArray(value)) {
      value.forEach(resetPrototype);
    } else if (typeof value === 'object' && value !== null) {
      Object.setPrototypeOf(value, Object.prototype);
      Object.values(value).forEach(resetPrototype);
    }
  }
  // mutate result object
  resetPrototype(result);

  console.dir(result, { depth: null });
}
