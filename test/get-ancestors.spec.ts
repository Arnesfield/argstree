import { expect } from 'chai';
import command, { getAncestors, Node } from '../src/index.js';

/**
 * Common node test data for `getAncestors` and `getDescendants`.
 * @returns The parsed root node.
 */
export function getNode(): Node {
  const cmd = command();
  cmd.option('--foo');
  cmd.option('--bar');
  cmd.command('foo', {
    init(foo) {
      foo.command('baz');
    }
  });
  cmd.command('baz', {
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

describe('getAncestors', () => {
  it('should be a function', () => {
    expect(getAncestors).to.be.a('function');
  });

  it('should get ancestor nodes', () => {
    const root = getNode();
    const node = root.children[3].children[3].children[1];
    expect(node.id).to.equal('--bar');
    expect(node.args).to.deep.equal(['1', '2']);

    const ancestors = getAncestors(node);
    expect(ancestors).to.be.an('array').that.has.length(3);

    // partial node object check
    for (const ancestor of ancestors) {
      expect(ancestor).to.have.property('id');
      expect(ancestor.args).to.be.an('array');
    }

    expect(ancestors[0].id).to.equal('foo');
    expect(ancestors[1].id).to.equal('baz');
    expect(ancestors[2].id).to.be.null;
  });
});
