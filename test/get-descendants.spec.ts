import { expect } from 'chai';
import { getDescendants, Node } from '../src';
import { createNode } from './common/create-node';
import { getNode } from './common/get-node';

function expectMatch(descendant: Node, match: Node) {
  expect(descendant).to.have.property('id').that.equals(match.id);
  expect(descendant).to.have.property('raw').that.equals(match.raw);
  expect(descendant).to.have.property('key').that.equals(match.key);
  expect(descendant).to.have.property('type').that.equals(match.type);
  expect(descendant).to.have.property('depth').that.equals(match.depth);
  expect(descendant).to.have.property('args').that.deep.equals(match.args);
  expect(descendant).to.have.property('parent');
}

describe('getDescendants', () => {
  it('should be a function', () => {
    expect(getDescendants).to.be.a('function');
  });

  it('should get descendant nodes', () => {
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
      createNode({ depth: 1, type: 'value', args: ['1'], parent: cmd0 }),
      createNode({ key: '--foo', depth: 1, args: ['2', '3'], parent: cmd0 }),
      createNode({ key: '--bar', depth: 1, parent: cmd0 }),
      cmd1,
      createNode({
        key: 'baz',
        depth: 2,
        type: 'value',
        args: ['1'],
        parent: cmd1
      }),
      createNode({ key: '--foo', depth: 2, args: ['baz'], parent: cmd1 }),
      createNode({ key: '--bar', depth: 2, parent: cmd1 }),
      cmd2,
      createNode({
        key: 'foo',
        depth: 3,
        type: 'value',
        args: ['1'],
        parent: cmd2
      }),
      createNode({ key: '--bar', depth: 3, args: ['1', '2'], parent: cmd2 })
    ];

    const root = getNode();
    const descendants = getDescendants(root);
    expect(descendants.length).to.equal(matches.length);

    for (let i = 0; i < matches.length; i++) {
      const descendant = descendants[i];
      const match = matches[i];

      expectMatch(descendant, match);
      if (descendant.parent && match.parent) {
        expectMatch(descendant.parent, match.parent);
      } else {
        // expect null parent
        expect(descendant.parent).to.equal(match.parent);
      }
    }
  });
});
