// @ts-check
import command, { isOption, option } from '../lib/index.js';

/** @returns {never} */
function help() {
  console.log(
    'Usage: node examples/parse.js hello --num 3.14 --no-bool cmd:run world -abc=15 --x.y.z 92 -- -a -b 65'
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
  /**
   * The node metadata.
   * @typedef Metadata
   * @property {boolean} [dot] Allow dot notation for the node.
   */

  const start = performance.now();
  const prefix = { cmd: 'cmd:', no: 'no-' };

  /** @type {import('../lib/index.js').Options<Metadata>['init']} */
  const init = schema => {
    schema
      .option('--help', { alias: '-h', assign: false, onCreate: help })
      .command('--', { strict: false });
  };

  /** @type {import('../lib/index.js').Options<Metadata>['parser']} */
  const parser = arg => {
    // match cmd:* commands
    if (
      arg.value == null &&
      arg.key.startsWith(prefix.cmd) &&
      arg.key !== `${prefix.cmd}--` // ignore 'cmd:--' that could be treated as '--'
    ) {
      // create command with recursive parser
      const id = arg.key.slice(prefix.cmd.length);
      return command({ id, name: id, init, parser });
    }

    // match short options
    if (isOption(arg.key, 'short')) {
      // treat negative numbers as values
      if (arg.value == null && !isNaN(Number(arg.key))) {
        return { args: arg.key, strict: false };
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
    }

    // match long options
    if (isOption(arg.key, 'long')) {
      // for option ids, remove first 2 hyphens
      const id = arg.key.slice(2);
      // for options starting with --no-*, stop reading args
      const read = !id.startsWith(prefix.no);
      return option({
        id,
        max: 1,
        args: arg.value,
        read,
        onCreate(node) {
          // only allow dot notation for long options so that short options
          // are not split (e.g. `-x.y` will not be treated like `--x.y`)
          node.meta = { dot: true };
        }
      });
    }
  };

  /** @type {import('../lib/index.js').Schema<Metadata>} */
  const cmd = command({ init, parser });
  const root = cmd.parse(args);

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

  let parent = result;

  // skip root node when iterating through nodes
  const nodes = root.children.slice();
  for (const node of nodes) {
    nodes.push(...node.children);

    // value nodes are saved to `_`
    const id = node.type === 'value' || node.id == null ? '_' : node.id;
    const props = node.meta?.dot ? id.split('.') : [id];
    // assume fallback to empty string is unreachable
    const last = props.pop() || '';

    // get nested object
    /** @type {Record<string, unknown>} */
    let obj = parent;
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

    // check props.length to ensure that only the root `--` is unformatted
    if (props.length === 0 && last === '--') {
      // always save unformatted args to the root object and stop parsing
      set(result, last, node.args);
      break;
    }

    // for command nodes, create another root object
    if (node.type === 'command') {
      // if value already exists, convert to array
      parent = { __proto__: null, _: [] };
      obj[last] = last in obj ? [obj[last], parent] : parent;
    } else if (node.args.length > 0) {
      // handle numbers and strings
      const values = node.args.map(arg => {
        // check and parse if number
        let n;
        return arg.trim() && !isNaN((n = Number(arg))) ? n : arg;
      });
      set(obj, last, values.length === 1 ? values[0] : values);
    } else {
      // handle booleans (args.length === 0)
      const negate = last.startsWith(prefix.no);
      const key = negate ? last.slice(prefix.no.length) : last;
      set(obj, key, !negate);
    }
  }

  /**
   * Recursively resets object prototype
   * to hide `[Object: null prototype]` from logs.
   * @param {unknown} value The object to reset the prototype of.
   */
  function resetPrototype(value) {
    // mutate the value object
    const stack = [value];
    for (let item; (item = stack.pop()); ) {
      if (Array.isArray(item)) {
        stack.push(...item);
      } else if (typeof item === 'object' && item !== null) {
        Object.setPrototypeOf(item, Object.prototype);
        stack.push(...Object.values(item));
      }
    }
  }
  // mutate result object
  resetPrototype(result);

  const end = performance.now();
  console.dir(result, { depth: null });
  console.log('\nDone in %o ms (no logging)', end - start);
}
