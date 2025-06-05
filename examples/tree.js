// @ts-check
import command, { flatten, isOption, option } from '../lib/index.js';

/** @returns {never} */
function help() {
  console.log(
    'Usage: node examples/tree.js hello :1 --name=world :2=subtree example :3 :2 --opt :3 :4 args :1 tree'
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
  /** @type {import('../lib/index.js').Options['parser']} */
  const parser = (arg, ctx) => {
    // create subtree for :1, :2, etc.
    // use value as name, e.g. :1=subtree
    const depth = ctx.node.depth + 1;
    const treeId = `:${depth}`;

    // return option with onValidate parser when tree key is matched
    if (arg.key === treeId) {
      const name = arg.value ?? `tree:depth(${depth})`;
      return option({ id: treeId, name, onValidate });
    }

    // do not parse as option if the last child node is a subtree
    const lastChild = ctx.node.children[ctx.node.children.length - 1];
    if ((!lastChild || lastChild.id !== treeId) && isOption(arg.key)) {
      const id = arg.key.replace(/^--?/, '');
      return option({ id, name: id, args: arg.value, read: arg.value == null });
    }
  };

  /** @type {import('../lib/index.js').Options['onValidate']} */
  const onValidate = ctx => {
    // create a subcommand that would parse ctx.node.args
    const subcmd = command({
      parser,
      onCreate(subctx) {
        // set subctx node values so descendant nodes will use these instead
        subctx.node.id = ctx.node.id;
        subctx.node.name = ctx.node.name;
        subctx.node.depth = ctx.node.depth;
      }
    });

    // parse tree using the args of the main tree node
    const tree = subcmd.parse(ctx.node.args);

    // replace args and children of the main tree node
    ctx.node.args = tree.args;
    ctx.node.children = tree.children;
  };

  const root = command({ parser })
    .option('--help', { alias: '-h', assign: false, onCreate: help })
    .command('--', { strict: false })
    .parse(args);

  for (const node of flatten(root)) {
    console.log(
      '%s%s%s:',
      '  '.repeat(node.depth),
      node.name,
      node.type === 'value' ? ` (${node.type})` : '',
      node.args
    );
  }
}
