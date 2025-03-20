// @ts-check
import { command, isOption, option } from '../lib/index.js';

/** @returns {never} */
function help() {
  console.log(
    'Usage: node examples/recursive.js hello --name world cmd:run command --option value cmd:subcommand --option -- foo bar baz'
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

/** @param {import('../lib/index.js').Arg} arg */
function getArgs(arg) {
  return arg.value != null ? [arg.value] : [];
}

/** @param {string[]} args */
function run(args) {
  // use 'init' and 'handler' for root command and subcommands
  const prefix = 'cmd:';

  /** @type {import('../lib/index.js').SchemaOptions['init']} */
  const init = schema => {
    schema
      .option('--help', { alias: '-h', preData: help })
      .command('--', { strict: false });
  };

  /** @type {import('../lib/index.js').SchemaOptions['handler']} */
  const handler = arg => {
    if (isOption(arg.key)) {
      // for option ids, remove first 2 hyphens
      return option({ id: arg.key.replace(/^--?/, ''), args: getArgs(arg) });
    } else if (arg.key.startsWith(prefix)) {
      // for command ids, remove 'cmd:' prefix
      const id = arg.key.slice(prefix.length);
      return command({ id, name: id, args: getArgs(arg), init, handler });
    }
  };

  const cmd = command({ id: 'root', init, handler });
  const root = cmd.parse(args);

  for (const node of [root].concat(root.descendants)) {
    console.log('%s%s:', '  '.repeat(node.depth), node.id, node.args);
  }
}
