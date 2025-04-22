// @ts-check
import command from '../lib/index.js';

/** @returns {never} */
function help() {
  console.log(
    'Usage: node examples/calc.js 3 + 1 + 2 x 3 + 2 / 2 + 1 x 2 x 3 + 3\n\n' +
      'Operations:\n' +
      '  +  add\n' +
      '  -  subtract\n' +
      "  x  multiply (or '*' with noglob)\n" +
      '  /  divide\n' +
      '  ^  exponent\n' +
      '  %  remainder\n' +
      '\nNote: No MDAS rules apply for this example.'
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
  const cmd = command();

  /** @type {import('../lib/index.js').Options} */
  const options = { min: 1, max: 1, assign: false };
  for (const operation of ['+', '-', 'x', '*', '/', '^', '%']) {
    // safely assume each node will have 1 argument
    cmd.option(operation, options);
  }

  const root = cmd
    .option('--help', { max: 0, alias: '-h', assign: false, preArgs: help })
    .parse(args);

  let result = 0;
  for (const node of root.children) {
    // parse last argument
    const arg = node.args.length > 0 ? node.args[node.args.length - 1] : null;
    const n = arg !== null ? Number(arg) : NaN;
    if (!isFinite(n)) {
      throw new Error(`Not a number: ${arg}`);
    }

    switch (node.id) {
      case null:
        result = n;
        break;
      case '+':
        result += n;
        break;
      case '-':
        result -= n;
        break;
      case 'x':
      case '*':
        result *= n;
        break;
      case '/':
        result /= n;
        break;
      case '^':
        result **= n;
        break;
      case '%':
        result %= n;
        break;
    }
  }

  console.log(result);
}
