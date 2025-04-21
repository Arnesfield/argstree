import { expect } from 'chai';
import { isOption } from '../src';

describe('isOption', () => {
  it('should be a function', () => {
    expect(isOption).to.be.a('function');
  });

  it('should determine if the provided arg looks like an alias or not', () => {
    // equal signs should still be treated like normal characters
    const valid = [
      // alias-likes
      '-a',
      '-foo',
      '-a=value',
      '-foo=value',
      '-=',
      '-=value',
      // option-likes
      '--a',
      '--foo',
      '--a=value',
      '--foo=value',
      '---a',
      '---foo',
      '--=',
      '--=value'
    ];
    const invalid = ['a', 'foo', '-', '--', '=', '=value', ''];

    for (const item of valid) {
      expect(isOption(item)).to.be.true;
    }
    for (const item of invalid) {
      expect(isOption(item)).to.be.false;
    }
  });
});
