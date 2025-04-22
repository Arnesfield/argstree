import { expect } from 'chai';
import command, { Node, option } from '../src';
import { createNode } from './common/create-node';

function expectNode(node: Node, actual: Node) {
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

describe('parse', () => {
  it('should return the root node', () => {
    let root = command().parse([]);
    let actual = createNode({ type: 'command' });
    expectNode(root, actual);

    root = option().parse([]);
    actual = createNode();
    expectNode(root, actual);
  });

  it("should use the provided 'id' and 'name' options", () => {
    let root = command({ id: 'root', name: 'root-name' }).parse([]);
    let actual = createNode({ id: 'root', name: 'root-name', type: 'command' });
    expectNode(root, actual);

    root = command({ id: null }).parse([]);
    actual = createNode({ id: null, name: null, type: 'command' });
    expectNode(root, actual);
  });

  it("should use the provided 'id' and 'name' options for child nodes", () => {
    let root = command()
      .command('cmd', { id: 'subcmd', name: 'subcmd-name' })
      .parse(['cmd']);
    let actual = createNode({ type: 'command' });
    expectNode(root, actual);
    expect(root.children).to.have.length(1);

    actual = createNode({
      id: 'subcmd',
      name: 'subcmd-name',
      raw: 'cmd',
      key: 'cmd',
      type: 'command',
      depth: 1
    });
    expectNode(root.children[0], actual);

    root = command().command('cmd', { id: null }).parse(['cmd']);
    actual = createNode({ type: 'command' });
    expectNode(root, actual);
    expect(root.children).to.have.length(1);

    actual = createNode({
      id: null,
      name: 'cmd',
      raw: 'cmd',
      key: 'cmd',
      type: 'command',
      depth: 1
    });
    expectNode(root.children[0], actual);
  });

  it("should fallback to 'key' for undefined options 'id' and 'name'", () => {
    const root = command()
      .command('cmd', { id: undefined, name: undefined })
      .parse(['cmd']);
    expectNode(root, createNode({ type: 'command' }));
    expect(root.children).to.have.length(1);
    expectNode(
      root.children[0],
      createNode({
        id: 'cmd',
        name: 'cmd',
        raw: 'cmd',
        key: 'cmd',
        type: 'command',
        depth: 1
      })
    );
  });
});
