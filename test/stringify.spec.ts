import { expect } from 'chai';
import { stringify } from '../src';

describe('stringify', () => {
  it('should be a function', () => {
    expect(stringify).to.be.a('function');
  });
});
