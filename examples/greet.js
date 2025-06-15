// @ts-check
import command from '../lib/index.js';

/** @returns {never} */
function help() {
  console.log(
    'Usage: node examples/greet.js --name "John Doe" --message Hello' +
      '\n\n' +
      '  -n, --name <name>        the name to greet\n' +
      "  -m, --message <message>  custom greeting message (default: 'Hello')"
  );
  process.exit();
}

try {
  const args = process.argv.slice(2);
  args.length > 0 ? run(args) : help();
} catch (error) {
  console.error(String(error));
  process.exitCode = 1;
}

/** @param {string[]} args */
function run(args) {
  performance.mark('start');
  const root = command({ read: false, strict: true })
    .option('--name', { id: 'name', min: 1, max: 1, alias: '-n' })
    .option('--message', { id: 'message', min: 1, max: 1, alias: '-m' })
    .option('--help', { alias: '-h', assign: false, onCreate: help })
    .parse(args);

  /** @type {{ name: string | null; message: string; }} */
  const opts = { name: null, message: 'Hello' };

  for (const node of root.children) {
    switch (node.id) {
      case 'name':
      case 'message':
        opts[node.id] = node.args[0];
        break;
    }
  }

  if (opts.name === null) {
    throw new Error("Option '--name' is required.");
  }

  const greeting = `${opts.message} ${opts.name}!`;

  performance.mark('end');
  console.log(greeting);

  const measure = performance.measure('time', 'start', 'end');
  console.log('\nDone in %o ms (no logging)', measure.duration);
}
