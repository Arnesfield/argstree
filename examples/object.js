import { spec } from '../lib/index.js';

function help() {
  console.log(
    "Usage: node examples/object.js .name='John Doe' .email=john.doe@example.com .roles.name=Admin"
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
  const cmd = spec({ max: 0, strict: true })
    .option('--help', { maxRead: 0, validate: help })
    .alias('-h')
    .args(arg => {
      if (!arg.startsWith('.')) {
        return;
      }
      // manually split by equal sign to manipulate initial args
      const index = arg.indexOf('=');
      const [id, initial] =
        index > -1 ? [arg.slice(0, index), [arg.slice(index + 1)]] : [arg, []];
      return { id, maxRead: 0, initial };
    });

  const root = cmd.parse(args);
  const object = Object.create(null);
  for (const node of root.children) {
    const hasArgs = node.args.length > 0;
    const props = node.id.split('.').slice(1);
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
          `Cannot set '${node.id}' because '.${read.join('.')}' is not an object.`
        );
      }
    }

    // some mini value transform
    if (hasArgs && last != null) {
      const value = node.args[0];
      curr[last] =
        isFinite(value) || ['null', 'false', 'true'].includes(value)
          ? JSON.parse(value)
          : value;
    }
  }

  console.log(JSON.stringify(object, undefined, 2));
}
