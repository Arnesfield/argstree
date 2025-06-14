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
  console.error(String(error));
  process.exitCode = 1;
}

/** @param {string[]} args */
function run(args) {
  /**
   * The node metadata.
   * @typedef Metadata
   * @property {boolean} [tree] Determines if the node args should be parsed.
   */

  const start = performance.now();

  /**
   * @param {import('../lib/index.js').Schema<Metadata>} schema
   * @param {number} depth
   */
  function addTreeOption(schema, depth) {
    // create subtree for :1, :2, etc.
    schema.option(`:${depth}`, {
      onCreate(node) {
        // remove and use the assigned value as name, e.g. :1=subtree
        node.name = node.args.pop() ?? `tree:depth(${depth})`;
        // parse the args of this node later
        node.meta = { tree: true };
      }
    });
  }

  /** @type {import('../lib/index.js').Options<Metadata>['parser']} */
  const parser = (arg, node) => {
    // do not parse option if the last child node is the current node (value type)
    const lastChild = node.children.at(-1);
    if ((!lastChild || lastChild.id === node.id) && isOption(arg.key)) {
      const id = arg.key.replace(/^--?/, '');
      return option({ id, name: id, args: arg.value, read: arg.value == null });
    }
  };

  const cmd = command({ parser })
    .option('--help', { alias: '-h', assign: false, onCreate: help })
    .command('--', { strict: false });
  addTreeOption(cmd, 1);

  // parse tree nodes with node.meta.tree flag
  const root = cmd.parse(args);
  const nodes = root.children.slice();

  for (const node of nodes) {
    if (!node.meta?.tree) continue;

    // create a subcommand to parse node.args
    const subcmd = command({
      id: node.id,
      name: node.name,
      parser,
      onCreate(subnode) {
        // override depth so that descendant nodes will use it instead
        subnode.depth = node.depth;
      }
    });
    addTreeOption(subcmd, node.depth + 1);

    // parse tree using the args of the main tree node
    const tree = subcmd.parse(node.args);

    // replace args and children of the main tree node
    node.args = tree.args;
    node.children = tree.children;

    // push to nodes to iterate through them as well
    nodes.push(...node.children);
  }

  const end = performance.now();

  for (const node of flatten(root)) {
    console.log(
      '%s%s%s:',
      '  '.repeat(node.depth),
      node.name,
      node.type === 'value' ? ` (${node.type})` : '',
      node.args
    );
  }

  console.log('\nDone in %o ms (no logging)', end - start);
}
