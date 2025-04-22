// @ts-check
import { command, getDescendants, isOption, option } from '../lib/index.js';

/** @returns {never} */
function help() {
  console.log(
    'Usage: node examples/recursive.js hello --option=1 world cmd:run command --option 2 3 -- --foo bar baz'
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

  /** @type {import('../lib/index.js').SchemaOptions['init']} */
  const init = schema => {
    schema
      .option('--help', { max: 0, alias: '-h', assign: false, preArgs: help })
      .command('--', { strict: false });
  };

  /** @type {import('../lib/index.js').SchemaOptions['handler']} */
  const handler = arg => {
    if (isOption(arg.key)) {
      // for option ids, remove first 2 hyphens
      const id = arg.key.replace(/^--?/, '');
      const args = arg.value != null ? [arg.value] : [];
      // change max arguments captured if a value is assigned
      return option({ id, args, max: args.length || null });
    } else if (arg.value == null && arg.key.startsWith(prefix)) {
      // commands start with 'cmd:' prefix and should not have assigned value
      // for command ids, remove prefix
      const id = arg.key.slice(prefix.length);
      return command({ id, init, handler });
    }
  };

  const cmd = command({ id: 'root', init, handler });
  const root = cmd.parse(args);

  for (const node of [root].concat(getDescendants(root))) {
    console.log(
      '%s%s%s:',
      '  '.repeat(node.depth),
      node.id,
      node.type === 'value' ? ` (${node.type})` : '',
      node.args
    );
  }
}
