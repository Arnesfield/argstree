import { expect } from 'chai';
import { Node } from '../../src';

export function expectNode(node: Node, actual: Node): void {
  expect(node).to.have.property('id').that.equals(actual.id);
  expect(node).to.have.property('name').that.equals(actual.name);
  expect(node).to.have.property('raw').that.equals(actual.raw);
  expect(node).to.have.property('key').that.equals(actual.key);
  expect(node).to.have.property('alias').that.equals(actual.alias);
  expect(node).to.have.property('type').that.equals(actual.type);
  expect(node).to.have.property('depth').that.equals(actual.depth);
  expect(node)
    .to.have.property('args')
    .that.is.an('array')
    .that.deep.equals(actual.args);
  expect(node)
    .to.have.property('args')
    .that.is.an('array')
    .that.deep.equals(actual.args);
  expect(node).to.have.property('parent');
  expect(node).to.have.property('children').that.is.an('array');
}

export function expectNodes(
  nodes: Node[],
  actual: Node[],
  matchParent?: boolean
): void {
  expect(nodes).to.have.length(actual.length);
  for (let i = 0; i < actual.length; i++) {
    const node = nodes[i];
    const match = actual[i];
    expectNode(node, match);

    if (!matchParent) {
      // do nothing
    } else if (node.parent && match.parent) {
      expectNode(node.parent, match.parent);
    } else {
      // expect null parent
      expect(node.parent).to.equal(match.parent);
    }
  }
}
