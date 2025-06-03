// @ts-check
import command, { flatten, isOption, option } from '../lib/index.js';

/** @returns {never} */
function help() {
  console.log(
    'Usage: node examples/recursive.js ' +
      'hello --input=src world cmd:run build --option 2 3 -- -a -b'
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
  // use 'init' and 'handler' for root command and subcommands
  const prefix = 'cmd:';

  /** @type {import('../lib/index.js').Options['init']} */
  const init = schema => {
    schema
      .option('--help', { alias: '-h', assign: false, onCreate: help })
      .command('--', { strict: false });
  };

  /** @type {import('../lib/index.js').Options['handler']} */
  const handler = arg => {
    if (isOption(arg.key)) {
      // stop reading arguments for this option if a value is assigned
      // for option ids, remove first 2 hyphens
      const id = arg.key.replace(/^--?/, '');
      return option({ id, args: arg.value, read: arg.value == null });
    } else if (arg.value == null && arg.key.startsWith(prefix)) {
      // commands should not have an assigned value
      // for command ids, remove prefix
      const id = arg.key.slice(prefix.length);
      return command({ id, init, handler });
    }
  };

  const cmd = command({ id: 'root', init, handler });
  const root = cmd.parse(args);

  for (const node of flatten(root)) {
    console.log(
      '%s%s%s:',
      '  '.repeat(node.depth),
      node.id,
      node.type === 'value' ? ` (${node.type})` : '',
      node.args
    );
  }
}
