import { expect } from 'chai';
import { split } from '../src';
import { createSplit } from './utils/create-split';

function expectSplit(opts: {
  value: string;
  match: string[];
  /** Prefix string with `:` for remainders. */
  items: string[];
}) {
  const result = split(opts.value, opts.match);
  expect(result).to.deep.equal(createSplit(opts.items));
}

describe('split', () => {
  it('should be a function', () => {
    expect(split).to.be.a('function');
  });

  it('should return a split object', () => {
    const result = split('', []);
    expect(result).to.be.an('object').that.is.not.null;
    expect(result).to.have.property('items').that.is.an('array').with.length(0);
    expect(result)
      .to.have.property('values')
      .that.is.an('array')
      .with.length(0);
    expect(result)
      .to.have.property('remainder')
      .that.is.an('array')
      .with.length(0);
  });

  it('should split value by provided matches', () => {
    expectSplit({
      value: 'cabacb',
      match: ['ab', 'a', 'c'],
      items: ['c', 'ab', 'a', 'c', ':b']
    });
  });

  it('should split in order of the provided matches', () => {
    const value = 'abcada';

    expectSplit({
      value,
      match: ['bc', 'ab', 'a', 'ca', 'ad', 'da'],
      items: ['a', 'bc', 'a', ':d', 'a']
    });

    const match = ['ab', 'bc', 'a', 'ca', 'ad', 'da'];
    expectSplit({ value, match, items: ['ab', ':c', 'a', ':d', 'a'] });

    match.sort((a, b) => b.length - a.length);
    expectSplit({ value, match, items: ['ab', 'ca', 'da'] });
  });

  it('should preserve the remaining value', () => {
    expectSplit({ value: 'abc', match: [], items: [':abc'] });

    expectSplit({
      value: 'acdabazacd',
      match: ['a', 'z'],
      items: ['a', ':cd', 'a', ':b', 'a', 'z', 'a', ':cd']
    });
  });

  it('should handle whitespace', () => {
    expectSplit({ value: '', match: [''], items: [] });

    expectSplit({
      value: 'ab cd ',
      match: ['', ' '],
      items: [':a', '', ':b', '', ' ', '', ':c', '', ':d', '', ' ']
    });

    expectSplit({
      value: 'ab cd ',
      match: [' ', ''],
      items: [':a', '', ':b', ' ', ':c', '', ':d', ' ']
    });

    expectSplit({
      value: 'a  b c',
      match: ['a', 'b', 'c'],
      items: ['a', ':  ', 'b', ': ', 'c']
    });
  });
});
