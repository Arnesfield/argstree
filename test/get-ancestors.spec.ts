import { expect } from 'chai';
import { getAncestors } from '../src/index.js';
import { getNode } from './common/get-node.js';

describe('getAncestors', () => {
  it('should be a function', () => {
    expect(getAncestors).to.be.a('function');
  });

  it('should get ancestor nodes', () => {
    const root = getNode();
    const node = root.children[3].children[3].children[1];
    expect(node.id).to.equal('--bar');
    expect(node.args).to.deep.equal(['1', '2']);

    const ancestors = getAncestors(node);
    expect(ancestors).to.be.an('array').that.has.length(3);

    // partial node object check
    for (const ancestor of ancestors) {
      expect(ancestor).to.have.property('id');
      expect(ancestor.args).to.be.an('array');
    }

    expect(ancestors[0].id).to.equal('foo');
    expect(ancestors[1].id).to.equal('baz');
    expect(ancestors[2].id).to.be.null;
  });
});
