import { spec } from '../lib/index.js';

function help() {
  console.log(
    'Usage: node examples/calc.js 3 + 1 + 2 x 3 + 2 / 2 + 1 x 2 x 3 + 3\n' +
      'Note: No MDAS rules apply for this example.'
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
  // safely assume each node args array will have 1 length
  const cmd = spec({ min: 1, max: 1, strict: true })
    .option('+', { min: 1, max: 1 })
    .option('-', { min: 1, max: 1 })
    .option('x', { min: 1, max: 1 })
    .option('/', { min: 1, max: 1 })
    .option('--help', { maxRead: 0, validate: help })
    .alias('-h');

  const root = cmd.parse(args);
  let result = parseFloat(root.args[0]);
  result = isFinite(result) ? result : 0;
  // loop through parsed arguments (<node>.children or <node>.descendants)
  for (const node of root.children) {
    const num = parseFloat(node.args[0]);
    if (!isFinite(num)) {
      continue;
    }
    switch (node.id) {
      case '+':
        result += num;
        break;
      case '-':
        result -= num;
        break;
      case 'x':
        result *= num;
        break;
      case '/':
        result /= num;
        break;
    }
  }

  console.log(result);
}
