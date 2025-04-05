import { expect } from 'chai';
import { isAlias } from '../src/index.js';

describe('isAlias', () => {
  it('should be a function', () => {
    expect(isAlias).to.be.a('function');
  });

  it('should determine if the provided arg looks like an alias or not', () => {
    // equal signs should still be treated like normal characters
    // as there may be cases where an equal sign is used as an alias
    const valid = ['-a', '-foo', '-a=value', '-foo=value', '-=', '-=value'];
    const invalid = [
      '--a',
      '--foo',
      '--a=value',
      '--foo=value',
      '---a',
      '---foo',
      '-',
      '=',
      '=value',
      ''
    ];

    for (const item of valid) {
      expect(isAlias(item)).to.be.true;
    }
    for (const item of invalid) {
      expect(isAlias(item)).to.be.false;
    }
  });
});
