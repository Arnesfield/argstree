import { expect } from 'chai';
import { display } from '../src/utils/display';
import { createNodes } from './common/create-nodes';

// TODO: remove test?
// NOTE: expect error messages to follow the display name result

describe('display', () => {
  it('should be a function', () => {
    expect(display).to.be.a('function');
  });

  it('should return the display name of the node', () => {
    const items: [Parameters<typeof display>[0], string][] = [
      [{ name: null, type: 'option' }, ''],
      [{ name: '--opt', type: 'option' }, "Option '--opt' "],
      [{ name: null, type: 'command' }, ''],
      [{ name: 'cmd', type: 'command' }, "Command 'cmd' "]
    ];

    for (const [partial, match] of items) {
      const [root] = createNodes(partial);
      expect(display(root)).to.equal(match);
    }
  });
});
