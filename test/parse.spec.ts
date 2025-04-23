import { expect } from 'chai';
import command, { NodeType, option } from '../src';
import { createNode } from './common/create-node';
import { expectNode } from './common/expect-node';

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
    let actual = createNode({
      id: 'root',
      name: 'root-name',
      type: 'command'
    });
    expectNode(root, actual);

    root = command({ id: null }).parse([]);
    actual = createNode({ id: null, name: null, type: 'command' });
    expectNode(root, actual);

    // for child nodes

    root = command()
      .command('cmd', { id: 'subcmd', name: 'subcmd-name' })
      .parse(['cmd']);
    actual = createNode({ type: 'command' });
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

  it('should not be strict by default', () => {
    // NOTE: strict checks are part of the error spec
    const fns: { fn: typeof command; type: NodeType }[] = [
      { fn: command, type: 'command' },
      { fn: option, type: 'option' }
    ];

    for (const { fn, type } of fns) {
      let root = fn().command('cmd').parse(['--foo', 'cmd', '--bar']);
      expectNode(root, createNode({ type, args: ['--foo'] }));
      expect(root.children).to.have.length(2);
      expectNode(
        root.children[0],
        createNode({ type: 'value', depth: 1, args: ['--foo'] })
      );
      expectNode(
        root.children[1],
        createNode({
          id: 'cmd',
          name: 'cmd',
          raw: 'cmd',
          key: 'cmd',
          type: 'command',
          depth: 1,
          args: ['--bar']
        })
      );

      root = fn({ strict: false }).parse(['foo', '--bar', '-baz']);
      expectNode(root, createNode({ type, args: ['foo', '--bar', '-baz'] }));
    }
  });

  it('should be variadic by default', () => {
    // TODO:
  });
});
