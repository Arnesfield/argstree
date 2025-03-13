import { expect } from 'chai';
import { split } from '../src/index.js';

describe('split', () => {
  it('should be a function', () => {
    expect(split).to.be.a('function');
  });

  it('should return a split object', () => {
    const result = split('', []);
    expect(result).to.be.an('object').that.is.not.null;
    expect(result).to.have.property('remainder').to.length(0);
    expect(result).to.have.property('values').that.is.an('array');
  });

  it('should split value by provided matches', () => {
    const result = split('cabacb', ['ab', 'a', 'c']);
    expect(result.values).to.deep.equal(['c', 'ab', 'a', 'c']);
    expect(result.remainder).to.deep.equal(['b']);
  });

  it('should split in order of the provided matches', () => {
    const value = 'abcada';

    let result = split(value, ['bc', 'ab', 'a', 'ca', 'ad', 'da']);
    expect(result.values).to.deep.equal(['a', 'bc', 'a', 'a']);
    expect(result.remainder).to.deep.equal(['d']);

    const matches = ['ab', 'bc', 'a', 'ca', 'ad', 'da'];
    result = split(value, matches);
    expect(result.values).to.deep.equal(['ab', 'a', 'a']);
    expect(result.remainder).to.deep.equal(['c', 'd']);

    result = split(
      value,
      matches.slice().sort((a, b) => b.length - a.length)
    );
    expect(result.values).to.deep.equal(['ab', 'ca', 'da']);
    expect(result.remainder).to.have.length(0);
  });

  it('should preserve the remaining value', () => {
    let result = split('abc', []);
    expect(result.values).to.have.length(0);
    expect(result.remainder).to.deep.equal(['abc']);

    result = split('acdabazacd', ['a', 'z']);
    expect(result.values).to.deep.equal(['a', 'a', 'a', 'z', 'a']);
    expect(result.remainder).to.deep.equal(['cd', 'b', 'cd']);
  });

  it('should handle whitespace', () => {
    let result = split('', ['']);
    expect(result.values).to.have.length(0);
    expect(result.remainder).to.have.length(0);

    result = split('ab cd ', ['', ' ']);
    expect(result.values).to.deep.equal(['', '', ' ', '', '', '', ' ']);
    expect(result.remainder).to.deep.equal(['a', 'b', 'c', 'd']);

    result = split('ab cd ', [' ', '']);
    expect(result.values).to.deep.equal(['', ' ', '', ' ']);
    expect(result.remainder).to.deep.equal(['a', 'b', 'c', 'd']);

    result = split('a  b c', ['a', 'b', 'c']);
    expect(result.values).to.deep.equal(['a', 'b', 'c']);
    expect(result.remainder).to.deep.equal(['  ', ' ']);
  });
});
