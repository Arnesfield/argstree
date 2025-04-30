import { expect } from 'chai';
import { display } from '../src/utils/display';
import { createNode } from './common/create-node';
import { Node } from '../src';

// NOTE: expect error messages to follow the display name result

describe('display', () => {
  it('should be a function', () => {
    expect(display).to.be.a('function');
  });

  it('should return the display name of the node', () => {
    const items: [Node, string][] = [
      [createNode(), ''],
      [createNode({ name: null }), ''],
      [createNode({ key: '--foo' }), "Option '--foo' "],
      [createNode({ name: 'FOO', key: '--foo' }), "Option 'FOO' "],
      [createNode({ name: null, key: '--foo' }), ''],
      [createNode({ type: 'command', key: 'foo' }), "Command 'foo' "],
      [
        createNode({ name: 'FOO', type: 'command', key: 'foo' }),
        "Command 'FOO' "
      ],
      [createNode({ name: null, type: 'command', key: 'foo' }), '']
    ];

    for (const [node, match] of items) {
      expect(display(node)).to.equal(match);
    }
  });
});
