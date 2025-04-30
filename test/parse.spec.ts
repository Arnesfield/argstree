import { expect } from 'chai';
import command, { NodeType, option } from '../src';
import { createNode } from './common/create-node';
import { expectNode, expectNodes } from './common/expect-node';

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

    root = command({ id: null, name: null }).parse([]);
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

    root = command().command('cmd', { id: null, name: null }).parse(['cmd']);
    actual = createNode({ type: 'command' });
    expectNode(root, actual);
    expect(root.children).to.have.length(1);

    actual = createNode({
      id: null,
      name: null,
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

      const children = [
        createNode({ type: 'value', depth: 1, args: ['--foo'] }),
        createNode({
          id: 'cmd',
          name: 'cmd',
          raw: 'cmd',
          key: 'cmd',
          type: 'command',
          depth: 1,
          args: ['--bar']
        })
      ];

      expectNodes(root.children, children);

      root = fn({ strict: false }).parse(['foo', '--bar', '-baz']);
      expectNode(root, createNode({ type, args: ['foo', '--bar', '-baz'] }));
    }
  });

  it('should match configured options or commands (+variadic arguments)', () => {
    const root = command()
      .option('--foo')
      .option('--baz')
      .command('cmd')
      .parse(
        ([] as string[]).concat(
          'foo',
          ['--foo', 'bar', 'baz', '--bar'],
          ['--baz', 'foo', 'bar'],
          ['cmd', '--foo', '--bar', '--baz']
        )
      );
    expectNode(root, createNode({ type: 'command', args: ['foo'] }));

    const children = [
      createNode({ type: 'value', args: ['foo'], depth: 1 }),
      createNode({
        id: '--foo',
        name: '--foo',
        raw: '--foo',
        key: '--foo',
        type: 'option',
        depth: 1,
        args: ['bar', 'baz', '--bar']
      }),
      createNode({
        id: '--baz',
        name: '--baz',
        raw: '--baz',
        key: '--baz',
        type: 'option',
        depth: 1,
        args: ['foo', 'bar']
      }),
      createNode({
        id: 'cmd',
        name: 'cmd',
        raw: 'cmd',
        key: 'cmd',
        type: 'command',
        depth: 1,
        args: ['--foo', '--bar', '--baz']
      })
    ];

    expectNodes(root.children, children);
  });

  it('should save initial arguments', () => {
    const root = command({ args: ['foo', 'bar'] })
      .option('--foo', { args: ['1', '2'] })
      .command('cmd', { args: ['arg1'] })
      .parse(['--foo=3', '4', 'cmd', 'arg2', '--foo=3']);
    expectNode(root, createNode({ type: 'command', args: ['foo', 'bar'] }));

    const children = [
      createNode({
        id: '--foo',
        name: '--foo',
        raw: '--foo=3',
        key: '--foo',
        depth: 1,
        args: ['1', '2', '3', '4']
      }),
      createNode({
        id: 'cmd',
        name: 'cmd',
        raw: 'cmd',
        key: 'cmd',
        type: 'command',
        depth: 1,
        args: ['arg1', 'arg2', '--foo=3']
      })
    ];

    expectNodes(root.children, children);

    // subcommand node should have value node
    const subcmd = root.children[1];
    expect(subcmd.children).to.have.length(1);
    expectNode(
      subcmd.children[0],
      createNode({
        id: 'cmd',
        name: 'cmd',
        raw: 'cmd',
        key: 'cmd',
        type: 'value',
        depth: 2,
        args: ['arg2', '--foo=3']
      })
    );
  });

  it('should use provided aliases and their args', () => {
    const root = command()
      .option('--foo', { alias: '-f' })
      .option('--bar', {
        alias: ['-b', ['--no-bar', '1'], ['--full-bar', '2']],
        args: ['0']
      })
      .command('cmd', { alias: ['c', 'cm', 'cdm'] })
      .parse(
        ([] as string[]).concat(
          ['-f', 'foo'],
          ['-b', '1'],
          ['--no-bar=2', '3'],
          ['--full-bar', '4'],
          ['c', 'cmd']
        )
      );
    // TODO:
    console.dir(root, { depth: null });
  });

  // TODO:
  it.skip('should use provided aliases object with proper args', () => {
    const root = command()
      .option('--foo', { args: ['0', '1'] })
      .option('--bar', { args: ['a', 'b'] })
      .parse(['-f=5', '6', 'F=f', 'g']);
    // TODO:
    expect(root.children).to.have.length(3);
    expectNode(
      root.children[0],
      createNode({
        id: '--foo',
        name: '--foo',
        raw: '-f=5',
        key: '--foo',
        alias: '-f',
        type: 'option',
        depth: 1,
        args: ['0', '1', '2', '3', '4', '5', '6']
      })
    );
  });
});
