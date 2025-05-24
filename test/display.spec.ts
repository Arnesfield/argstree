import { expect } from 'chai';
import { display } from '../src/utils/display';

// NOTE: expect error messages to follow the display name result
// this is an internal function but test anyway to check the correctness of the display name

describe('display', () => {
  it('should be a function', () => {
    expect(display).to.be.a('function');
  });

  it('should return the display name of the node', () => {
    const items: [Parameters<typeof display>[0], string][] = [
      [{ name: null, type: 'option' }, ''],
      [{ name: '', type: 'option' }, "Option '' "],
      [{ name: '--opt', type: 'option' }, "Option '--opt' "],
      [{ name: null, type: 'command' }, ''],
      [{ name: '', type: 'command' }, "Command '' "],
      [{ name: 'cmd', type: 'command' }, "Command 'cmd' "]
    ];

    for (const [partial, match] of items) {
      expect(display(partial)).to.equal(match);
    }
  });
});
