import { expect } from 'chai';
import command, { flatten } from '../src';
import { createNodes } from './utils/create-nodes';

describe('flatten', () => {
  it('should be a function', () => {
    expect(flatten).to.be.a('function');
  });

  it('should flatten nodes from the provided root node', () => {
    const root = command()
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
      })
      .parse(
        ([] as string[]).concat(
          '1',
          ['--foo', '2', '3'],
          '--bar',
          ['baz', '1'],
          ['--foo', 'baz'],
          '--bar',
          ['foo', '1'],
          ['--bar', '1', '2']
        )
      );

    const expected = createNodes({
      type: 'command',
      args: ['1'],
      children: [
        { type: 'value', args: ['1'] },
        { key: '--foo', args: ['2', '3'] },
        { key: '--bar' },
        {
          key: 'baz',
          type: 'command',
          args: ['1'],
          children: [
            { key: 'baz', type: 'value', args: ['1'] },
            { key: '--foo', args: ['baz'] },
            { key: '--bar' },
            {
              key: 'foo',
              type: 'command',
              args: ['1'],
              children: [
                { key: 'foo', type: 'value', args: ['1'] },
                { key: '--bar', args: ['1', '2'] }
              ]
            }
          ]
        }
      ]
    });

    expect(root).to.deep.equal(expected[0]);

    const nodes = flatten(root);
    expect(nodes).to.deep.equal(expected);

    // try to flatten the next child command node by index
    const indices = [3, 3];
    for (const index of indices) {
      const node = root.children[index];
      const nodes = flatten(node);
      const expectedNodes = expected.slice(index + 1);
      expect(nodes).to.deep.equal(expectedNodes);
    }
  });
});
