import { expect } from 'chai';
import command, { flatten, Node } from '../src';
import { createNode } from './common/create-node';
import { expectNodes } from './common/expect-node';

function getNode(): Node {
  const cmd = command()
    .option('--foo')
    .option('--bar')
    .command('foo', {
      init(foo) {
        foo.command('baz');
      }
    })
    .command('baz', {
      init(baz) {
        baz.option('--foo');
        baz.option('--bar');
        baz.command('foo', {
          init(baz) {
            baz.option('--foo');
            baz.option('--bar');
          }
        });
      }
    });

  const args = ([] as string[]).concat(
    '1',
    ['--foo', '2', '3'],
    '--bar',
    ['baz', '1'],
    ['--foo', 'baz'],
    '--bar',
    ['foo', '1'],
    ['--bar', '1', '2']
  );

  return cmd.parse(args);
}

function getMatches(): Node[] {
  const cmd0 = createNode({ type: 'command', args: ['1'] });
  const cmd1 = createNode({
    key: 'baz',
    type: 'command',
    depth: 1,
    args: ['1'],
    parent: cmd0
  });
  const cmd2 = createNode({
    key: 'foo',
    type: 'command',
    depth: 2,
    args: ['1'],
    parent: cmd1
  });

  const matches: Node[] = [
    cmd0, // index 0
    createNode({ depth: 1, type: 'value', args: ['1'], parent: cmd0 }),
    createNode({ key: '--foo', depth: 1, args: ['2', '3'], parent: cmd0 }),
    createNode({ key: '--bar', depth: 1, parent: cmd0 }),
    cmd1, // index 4
    createNode({
      key: 'baz',
      depth: 2,
      type: 'value',
      args: ['1'],
      parent: cmd1
    }),
    createNode({ key: '--foo', depth: 2, args: ['baz'], parent: cmd1 }),
    createNode({ key: '--bar', depth: 2, parent: cmd1 }),
    cmd2, // index 8
    createNode({
      key: 'foo',
      depth: 3,
      type: 'value',
      args: ['1'],
      parent: cmd2
    }),
    createNode({ key: '--bar', depth: 3, args: ['1', '2'], parent: cmd2 })
  ];

  return matches;
}

describe('flatten', () => {
  it('should be a function', () => {
    expect(flatten).to.be.a('function');
  });

  it('should flatten nodes from the provided root node', () => {
    const root = getNode();
    const nodes = flatten(root);
    const matches = getMatches();
    expectNodes(nodes, matches, true);

    // try to flatten the next child command node by index
    const indices = [3, 3];
    for (const index of indices) {
      const node = root.children[index];
      const nodes = flatten(node);
      const actual = matches.slice(index + 1);
      expectNodes(nodes, actual, true);
    }
  });
});
