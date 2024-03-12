import { expect } from 'chai';
import { argstree } from '../src';

describe('argstree', () => {
  it('should be a function', () => {
    expect(argstree).to.be.a('function');
  });

  it('should return a node object (root)', () => {
    const node = argstree([], {});
    expect(node).to.be.an('object');
    expect(node).to.have.property('id').that.is.null;
    expect(node).to.have.property('depth').that.is.a('number').equal(0);
    expect(node).to.have.property('args').that.is.an('array');
    expect(node).to.have.property('parent').that.is.null;
    expect(node).to.have.property('children').that.is.an('array');
    expect(node).to.have.property('ancestors').that.is.an('array');
    expect(node).to.have.property('descendants').that.is.an('array');
  });
});
