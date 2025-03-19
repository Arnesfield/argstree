// @ts-check
import { command, option } from '../lib/index.js';

/** @returns {never} */
function help() {
  console.log(
    "Usage: node examples/object.js .name='John Doe' .email=john.doe@example.com .roles.name=Admin"
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
    max: 0,
    strict: true,
    handler(arg) {
      if (arg.key.startsWith('.')) {
        return option({
          maxRead: 0,
          args: arg.value != null ? [arg.value] : []
        });
      }
    }
  }).option('--help', { alias: '-h', maxRead: 0, preParse: help });

  const root = cmd.parse(args);
  const object = Object.create(null);
  for (const node of root.children) {
    const hasArgs = node.args.length > 0;
    const props = node.id ? node.id.split('.').slice(1) : [];
    const last = hasArgs ? props.pop() : null;

    // this is just an example, but it could probably be better
    /** @type {string[]} */
    const read = [];
    let curr = object;
    for (const prop of props) {
      read.push(prop);
      if (!(prop in curr)) {
        curr = curr[prop] = Object.create(null);
      } else if (typeof curr[prop] === 'object' && curr[prop] !== null) {
        curr = curr[prop];
      } else {
        throw new Error(
          `Cannot set '${node.id}' because '.${read.join('.')}' ` +
            `is of data type: ${typeof curr[prop]}`
        );
      }
    }

    // some mini value transform
    if (hasArgs && last != null) {
      const value = node.args[0];
      curr[last] =
        isFinite(Number(value)) || ['null', 'false', 'true'].includes(value)
          ? JSON.parse(value)
          : value;
    }
  }

  console.log(JSON.stringify(object, undefined, 2));
}
