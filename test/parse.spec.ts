import { expect } from 'chai';
import command, { NodeType, option } from '../src';
import { createNodes } from './common/create-nodes';

describe('parse', () => {
  it('should return the root node', () => {
    let root = command().parse([]);
    let [actual] = createNodes({ type: 'command' });
    expect(root).to.deep.equal(actual);

    root = option().parse([]);
    [actual] = createNodes();
    expect(root).to.deep.equal(actual);
  });

  it("should use the provided 'id' and 'name' options", () => {
    let root = command({ id: 'root', name: 'root-name' }).parse([]);
    let [actual] = createNodes({
      id: 'root',
      name: 'root-name',
      type: 'command'
    });
    expect(root).to.deep.equal(actual);

    root = command({ id: null, name: null }).parse([]);
    [actual] = createNodes({ id: null, name: null, type: 'command' });
    expect(root).to.deep.equal(actual);

    // for child nodes

    root = command()
      .command('cmd', { id: 'subcmd', name: 'subcmd-name' })
      .parse(['cmd']);
    [actual] = createNodes({
      type: 'command',
      children: [
        {
          id: 'subcmd',
          name: 'subcmd-name',
          raw: 'cmd',
          key: 'cmd',
          type: 'command'
        }
      ]
    });
    expect(root).to.deep.equal(actual);

    root = command().command('cmd', { id: null, name: null }).parse(['cmd']);
    [actual] = createNodes({
      type: 'command',
      children: [
        { id: null, name: null, raw: 'cmd', key: 'cmd', type: 'command' }
      ]
    });
    expect(root).to.deep.equal(actual);
  });

  it("should fallback to 'key' for undefined options 'id' and 'name'", () => {
    const root = command()
      .command('cmd', { id: undefined, name: undefined })
      .parse(['cmd']);
    const [actual] = createNodes({
      type: 'command',
      children: [
        { id: 'cmd', name: 'cmd', raw: 'cmd', key: 'cmd', type: 'command' }
      ]
    });
    expect(root).to.deep.equal(actual);
  });

  it('should not be strict by default', () => {
    // NOTE: strict checks are part of the error spec
    const fns: { fn: typeof command; type: NodeType }[] = [
      { fn: command, type: 'command' },
      { fn: option, type: 'option' }
    ];

    for (const { fn, type } of fns) {
      let root = fn().command('cmd').parse(['--foo', 'cmd', '--bar']);
      let [actual] = createNodes({
        type,
        args: ['--foo'],
        children: [
          { type: 'value', args: ['--foo'] },
          {
            id: 'cmd',
            name: 'cmd',
            raw: 'cmd',
            key: 'cmd',
            type: 'command',
            args: ['--bar'],
            children: [
              {
                id: 'cmd',
                name: 'cmd',
                raw: 'cmd',
                key: 'cmd',
                type: 'value',
                args: ['--bar']
              }
            ]
          }
        ]
      });
      expect(root).to.deep.equal(actual);

      root = fn({ strict: false }).parse(['foo', '--bar', '-baz']);
      [actual] = createNodes({
        type,
        args: ['foo', '--bar', '-baz'],
        children: [{ type: 'value', args: ['foo', '--bar', '-baz'] }]
      });
      expect(root).to.deep.equal(actual);
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
    const [actual] = createNodes({
      type: 'command',
      args: ['foo'],
      children: [
        { type: 'value', args: ['foo'] },
        {
          id: '--foo',
          name: '--foo',
          raw: '--foo',
          key: '--foo',
          args: ['bar', 'baz', '--bar']
        },
        {
          id: '--baz',
          name: '--baz',
          raw: '--baz',
          key: '--baz',
          args: ['foo', 'bar']
        },
        {
          id: 'cmd',
          name: 'cmd',
          raw: 'cmd',
          key: 'cmd',
          type: 'command',
          args: ['--foo', '--bar', '--baz'],
          children: [
            {
              id: 'cmd',
              name: 'cmd',
              raw: 'cmd',
              key: 'cmd',
              type: 'value',
              args: ['--foo', '--bar', '--baz']
            }
          ]
        }
      ]
    });
    expect(root).to.deep.equal(actual);
  });

  it('should save initial arguments', () => {
    const root = command({ args: ['foo', 'bar'] })
      .option('--foo', { args: ['1', '2'] })
      .command('cmd', { args: ['arg1'] })
      .parse(['--foo=3', '4', 'cmd', 'arg2', '--foo=3']);
    const [actual] = createNodes({
      type: 'command',
      args: ['foo', 'bar'],
      children: [
        {
          id: '--foo',
          name: '--foo',
          raw: '--foo=3',
          key: '--foo',
          args: ['1', '2', '3', '4']
        },
        {
          id: 'cmd',
          name: 'cmd',
          raw: 'cmd',
          key: 'cmd',
          type: 'command',
          args: ['arg1', 'arg2', '--foo=3'],
          children: [
            {
              id: 'cmd',
              name: 'cmd',
              raw: 'cmd',
              key: 'cmd',
              type: 'value',
              args: ['arg2', '--foo=3']
            }
          ]
        }
      ]
    });
    expect(root).to.deep.equal(actual);
  });

  it('should handle and split provided aliases and use their args', () => {
    const root = command()
      .option('bar', { alias: ['b', 'f'] })
      .option('--foo', { alias: '-f' })
      .option('--bar', {
        alias: ['-b', ['--bar-alias-1', '2']],
        args: ['0', '1']
      })
      .command('cmd', { alias: ['c', 'cm', 'cdm'] })
      .parse(
        ([] as string[]).concat(
          ['-f', 'foo'],
          ['-f=bar', 'baz'],
          ['-b', '2'],
          ['--bar-alias-1=3', '4'],
          ['-bf=2', '3'],
          ['c', 'cmd', '-fb']
        )
      );
    const [actual] = createNodes({
      type: 'command',
      children: [
        {
          id: '--foo',
          name: '--foo',
          raw: '-f',
          key: '--foo',
          alias: '-f',
          args: ['foo']
        },
        {
          id: '--foo',
          name: '--foo',
          raw: '-f=bar',
          key: '--foo',
          alias: '-f',
          args: ['bar', 'baz']
        },
        {
          id: '--bar',
          name: '--bar',
          raw: '-b',
          key: '--bar',
          alias: '-b',
          args: ['0', '1', '2']
        },
        {
          id: '--bar',
          name: '--bar',
          raw: '--bar-alias-1=3',
          key: '--bar',
          alias: '--bar-alias-1',
          args: ['0', '1', '2', '3', '4']
        },
        {
          id: '--bar',
          name: '--bar',
          raw: '-bf=2',
          key: '--bar',
          alias: '-b',
          args: ['0', '1']
        },
        {
          id: '--foo',
          name: '--foo',
          raw: '-bf=2',
          key: '--foo',
          alias: '-f',
          args: ['2', '3']
        },
        {
          id: 'cmd',
          name: 'cmd',
          raw: 'c',
          key: 'cmd',
          alias: 'c',
          type: 'command',
          args: ['cmd', '-fb'],
          children: [
            {
              id: 'cmd',
              name: 'cmd',
              raw: 'c',
              key: 'cmd',
              alias: 'c',
              type: 'value',
              args: ['cmd', '-fb']
            }
          ]
        }
      ]
    });
    expect(root).to.deep.equal(actual);
  });

  // TODO:
});
