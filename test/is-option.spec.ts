import { expect } from 'chai';
import { isOption } from '../src';

// equal signs should still be treated like normal characters
const shortOptions = ['-a', '-foo', '-a=value', '-foo=value', '-=', '-=value'];

const longOptions = [
  '--a',
  '--foo',
  '--a=value',
  '--foo=value',
  '---a',
  '------foo',
  '--=',
  '--=value'
];

const invalidOptions = ['', 'a', 'foo', '=', '=value', '-', '--', '------'];

function expectOptions(
  options: string[],
  actual: boolean,
  type?: 'long' | 'short'
) {
  for (const option of options) {
    expect(
      isOption(option, type),
      `Invalid ${type ? `${type} ` : ''}option '${option}'`
    ).to.equal(actual);
  }
}

describe('isOption', () => {
  it('should be a function', () => {
    expect(isOption).to.be.a('function');
  });

  it("should return 'true' for valid options", () => {
    expectOptions(shortOptions.concat(longOptions), true);
    expectOptions(invalidOptions, false);
  });

  it("should return 'true' for valid 'short' options", () => {
    expectOptions(shortOptions, true, 'short');
    expectOptions(longOptions.concat(invalidOptions), false, 'short');
  });

  it("should return 'true' for valid 'long' options", () => {
    expectOptions(longOptions, true, 'long');
    expectOptions(shortOptions.concat(invalidOptions), false, 'long');
  });
});
