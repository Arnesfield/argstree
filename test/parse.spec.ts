import { expect } from 'chai';
import command, { NodeType, option, SchemaMap } from '../src';
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

  it('should override existing options or commands', () => {
    const schema = command()
      .option('--foo', { alias: '-f' })
      .option('--foo', { id: 'FOO' })
      .command('bar', { id: 'BAR' })
      .command('bar', { alias: 'b' });

    const map = schema.schemas();
    const actualMap: SchemaMap = {
      '--foo': option({ id: 'FOO' }),
      bar: command({ alias: 'b' })
    };
    expect(Object.getPrototypeOf(map)).to.be.null;
    expect(map).to.deep.equal(actualMap);

    const root = schema.parse(['--foo', 'bar']);
    const [actual] = createNodes({
      type: 'command',
      children: [
        { id: 'FOO', name: '--foo', raw: '--foo', key: '--foo' },
        { id: 'bar', name: 'bar', raw: 'bar', key: 'bar', type: 'command' }
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
          value: '3',
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

  it('should not split short options', () => {
    const root = command()
      .option('-i')
      .option('-o')
      .option('-n')
      .command('n')
      .parse(['-ion']);
    const [actual] = createNodes({
      type: 'command',
      args: ['-ion'],
      children: [{ type: 'value', args: ['-ion'] }]
    });
    expect(root).to.deep.equal(actual);
  });

  it('should handle aliases and their args', () => {
    const root = command()
      .option('--foo', { alias: '-f' })
      .option('foo', { alias: 'f', args: '1' })
      .option('--bar', {
        alias: ['-ba', ['-b', '4']],
        args: ['2', '3'],
        assign: false
      })
      .parse(['-f=0', '1', 'f=2', '3', '-b=4', '-b', '5']);
    const [actual] = createNodes({
      type: 'command',
      children: [
        {
          id: '--foo',
          name: '--foo',
          raw: '-f=0',
          key: '--foo',
          alias: '-f',
          value: '0',
          args: ['0', '1']
        },
        {
          id: 'foo',
          name: 'foo',
          raw: 'f=2',
          key: 'foo',
          alias: 'f',
          value: '2',
          args: ['1', '2', '3', '-b=4']
        },
        {
          id: '--bar',
          name: '--bar',
          raw: '-b',
          key: '--bar',
          alias: '-b',
          args: ['2', '3', '4', '5']
        }
      ]
    });
    expect(root).to.deep.equal(actual);
  });

  it('should split aliases and use their args', () => {
    const root = command()
      .option('--input', { alias: ['i', ['-i', '2']], args: ['0', '1'] })
      .option('--interactive', { alias: ['in', ['-in', '3']], args: '2' })
      .option('--dry-run', { alias: ['--n', ['-n', '5']], args: ['3', '4'] })
      .parse(['-nini=3', '4', '--xnini']);
    const [actual] = createNodes({
      type: 'command',
      children: [
        {
          id: '--dry-run',
          name: '--dry-run',
          raw: '-nini=3',
          key: '--dry-run',
          alias: '-n',
          args: ['3', '4', '5']
        },
        {
          id: '--interactive',
          name: '--interactive',
          raw: '-nini=3',
          key: '--interactive',
          alias: '-in',
          args: ['2', '3']
        },
        {
          id: '--input',
          name: '--input',
          raw: '-nini=3',
          key: '--input',
          alias: '-i',
          value: '3',
          args: ['0', '1', '2', '3', '4', '--xnini']
        }
      ]
    });
    expect(root).to.deep.equal(actual);
  });

  it('should ignore empty aliases', () => {
    const root = command()
      .option('--input', { alias: [] })
      .option('--output', { alias: [[], [], []] })
      .parse(['--input', '--output']);
    const [actual] = createNodes({
      type: 'command',
      children: [
        { id: '--input', name: '--input', raw: '--input', key: '--input' },
        { id: '--output', name: '--output', raw: '--output', key: '--output' }
      ]
    });
    expect(root).to.deep.equal(actual);
  });

  it('should prioritize matching arguments over similar aliases', () => {
    const root = command()
      .option('-i')
      .option('--input', { alias: ['-i', 'run'] })
      .option('--output', { alias: '-o' })
      .command('run', { alias: '--input' })
      .parse(['-i', '0', '-io', '--input', 'run']);
    const [actual] = createNodes({
      type: 'command',
      children: [
        { id: '-i', name: '-i', raw: '-i', key: '-i', args: ['0'] },
        {
          id: '--input',
          name: '--input',
          raw: '-io',
          key: '--input',
          alias: '-i'
        },
        {
          id: '--output',
          name: '--output',
          raw: '-io',
          key: '--output',
          alias: '-o'
        },
        { id: '--input', name: '--input', raw: '--input', key: '--input' },
        { id: 'run', name: 'run', raw: 'run', key: 'run', type: 'command' }
      ]
    });
    expect(root).to.deep.equal(actual);
  });

  // TODO:
});
