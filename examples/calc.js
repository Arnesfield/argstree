// @ts-check
import command from '../lib/index.js';

/** @returns {never} */
function help() {
  console.log(
    'Usage: node examples/calc.js 3 + 1 + 2 x 3 + 2 / 2 + 1 x 2 x 3 + 3' +
      '\n\nOperations:\n' +
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
  const start = performance.now();
  const cmd = command();

  /** @type {import('../lib/index.js').Options} */
  const options = { min: 1, max: 1, assign: false };
  for (const operation of ['+', '-', 'x', '*', '/', '^', '%']) {
    cmd.option(operation, options);
  }

  const root = cmd
    .option('--help', { alias: '-h', assign: false, onCreate: help })
    .parse(args);

  let result = 0;
  for (const node of root.children) {
    // get the last argument since value nodes can have multiple args
    /** @type {number} */
    let n;
    const arg = node.args.at(-1);
    if (arg == null || !isFinite((n = Number(arg)))) {
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

  const end = performance.now();
  console.log(result);
  console.log('\nDone in %o ms (no logging)', end - start);
}
