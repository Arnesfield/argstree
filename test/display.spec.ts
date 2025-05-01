import { expect } from 'chai';
import { display } from '../src/utils/display';
import { createNodes, PartialNode } from './common/create-nodes';

// NOTE: expect error messages to follow the display name result

describe('display', () => {
  it('should be a function', () => {
    expect(display).to.be.a('function');
  });

  it('should return the display name of the node', () => {
    const items: [PartialNode, string][] = [
      [{}, ''],
      [{ name: null }, ''],
      [{ key: '--foo' }, "Option '--foo' "],
      [{ name: 'FOO', key: '--foo' }, "Option 'FOO' "],
      [{ name: null, key: '--foo' }, ''],
      [{ type: 'command', key: 'foo' }, "Command 'foo' "],
      [{ name: 'FOO', type: 'command', key: 'foo' }, "Command 'FOO' "],
      [{ name: null, type: 'command', key: 'foo' }, '']
    ];

    for (const [partial, match] of items) {
      const [root] = createNodes(partial);
      expect(display(root)).to.equal(match);
    }
  });
});
