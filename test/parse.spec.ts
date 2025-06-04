import { expect } from 'chai';
import command, { Arg, Context, NodeType, option, SchemaMap } from '../src';
import { createNodes } from './utils/create-nodes';
import { Schema as SchemaClass } from '../src/schema/schema.class';

describe('parse', () => {
  it('should return the root node', () => {
    let root = command().parse([]);
    let [actual] = createNodes({ type: 'command' });
    expect(root).to.deep.equal(actual);

    root = option().parse([]);
    [actual] = createNodes();
    expect(root).to.deep.equal(actual);
  });

  it("should fallback to 'key' for undefined options 'id' and 'name'", () => {
    const root = command()
      .option('--input')
      .command('run', { id: undefined, name: undefined })
      .parse(['--input', 'run']);
    const [actual] = createNodes({
      type: 'command',
      children: [
        { id: '--input', name: '--input', raw: '--input', key: '--input' },
        { id: 'run', name: 'run', raw: 'run', key: 'run', type: 'command' }
      ]
    });
    expect(root).to.deep.equal(actual);
  });

  it("should use the provided 'id' and 'name' options", () => {
    let root = command({ id: null, name: null }).parse([]);
    let [actual] = createNodes({ id: null, name: null, type: 'command' });
    expect(root).to.deep.equal(actual);

    root = command({ id: 'root', name: 'root-name' })
      .option('--input', { id: 'INPUT', name: 'input' })
      .option('--output', { id: null, name: null })
      .command('run', { id: 'RUN', name: 'run-cmd' })
      .parse(['--input', '--output', 'run']);
    [actual] = createNodes({
      id: 'root',
      name: 'root-name',
      type: 'command',
      children: [
        { id: 'INPUT', name: 'input', raw: '--input', key: '--input' },
        { id: null, name: null, raw: '--output', key: '--output' },
        { id: 'RUN', name: 'run-cmd', raw: 'run', key: 'run', type: 'command' }
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
      .option('--bar', { alias: ['-ba', ['-b', '4']], args: ['2', '3'] })
      .command('foo', { alias: 'f', args: '1' })
      .parse(['-f=0', '1', '-b', '5', 'f', '2', '3', '-b=4']);
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
          id: '--bar',
          name: '--bar',
          raw: '-b',
          key: '--bar',
          alias: '-b',
          args: ['2', '3', '4', '5']
        },
        {
          id: 'foo',
          name: 'foo',
          raw: 'f',
          key: 'foo',
          alias: 'f',
          type: 'command',
          args: ['1', '2', '3', '-b=4'],
          children: [
            {
              id: 'foo',
              name: 'foo',
              raw: 'f',
              key: 'foo',
              alias: 'f',
              type: 'value',
              args: ['2', '3', '-b=4']
            }
          ]
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

  it("should handle 'max' range option", () => {
    // NOTE: range errors are part of the error spec
    const root = command()
      .option('--input', { max: 2 })
      .option('--output', { max: 1 })
      .parse(
        ([] as string[]).concat(
          ['--input', 'src', 'test', 'tmp', 'node_modules'],
          ['--output', 'dist', 'lib', 'build']
        )
      );
    const [actual] = createNodes({
      type: 'command',
      args: ['tmp', 'node_modules', 'lib', 'build'],
      children: [
        {
          id: '--input',
          name: '--input',
          raw: '--input',
          key: '--input',
          args: ['src', 'test']
        },
        { type: 'value', args: ['tmp', 'node_modules'] },
        {
          id: '--output',
          name: '--output',
          raw: '--output',
          key: '--output',
          args: ['dist']
        },
        { type: 'value', args: ['lib', 'build'] }
      ]
    });
    expect(root).to.deep.equal(actual);
  });

  it("should not 'read' when set to false", () => {
    // NOTE: read errors are part of the error spec
    const root = command()
      .option('--help', { read: false })
      .parse(['--help', 'value']);
    const [actual] = createNodes({
      type: 'command',
      args: ['value'],
      children: [
        { id: '--help', name: '--help', raw: '--help', key: '--help' },
        { type: 'value', args: ['value'] }
      ]
    });
    expect(root).to.deep.equal(actual);
  });

  it("should handle default 'assign' option", () => {
    const cmd = command()
      .option('--input', { alias: '-i' })
      .command('run', { alias: 'r' });

    let root = cmd.parse(['--input=0', 'run=1']);
    let [actual] = createNodes({
      type: 'command',
      children: [
        {
          id: '--input',
          name: '--input',
          raw: '--input=0',
          key: '--input',
          value: '0',
          args: ['0', 'run=1']
        }
      ]
    });
    expect(root).to.deep.equal(actual);

    root = cmd.parse(['-ii=0', 'r=1']);
    [actual] = createNodes({
      type: 'command',
      children: [
        {
          id: '--input',
          name: '--input',
          raw: '-ii=0',
          key: '--input',
          alias: '-i'
        },
        {
          id: '--input',
          name: '--input',
          raw: '-ii=0',
          key: '--input',
          alias: '-i',
          value: '0',
          args: ['0', 'r=1']
        }
      ]
    });
    expect(root).to.deep.equal(actual);
  });

  it('should handle assign option', () => {
    const cmd = command()
      .option('--input', { alias: '-i', assign: false })
      .command('run', { alias: 'r', assign: true });

    let root = cmd.parse(['--input=0', 'run=1']);
    let [actual] = createNodes({
      type: 'command',
      args: ['--input=0'],
      children: [
        { type: 'value', args: ['--input=0'] },
        {
          id: 'run',
          name: 'run',
          raw: 'run=1',
          key: 'run',
          value: '1',
          type: 'command',
          args: ['1']
        }
      ]
    });
    expect(root).to.deep.equal(actual);

    root = cmd.parse(['-ii=0', 'r=1']);
    [actual] = createNodes({
      type: 'command',
      args: ['-ii=0'],
      children: [
        { type: 'value', args: ['-ii=0'] },
        {
          id: 'run',
          name: 'run',
          raw: 'r=1',
          key: 'run',
          alias: 'r',
          value: '1',
          type: 'command',
          args: ['1']
        }
      ]
    });
    expect(root).to.deep.equal(actual);
  });

  it("should handle 'leaf' option", () => {
    // assume default leaf option is handled by other cases
    let root = command({ leaf: true }).option('--input').parse(['--input']);
    let [actual] = createNodes({
      type: 'command',
      args: ['--input'],
      children: [{ type: 'value', args: ['--input'] }]
    });
    expect(root).to.deep.equal(actual);

    root = command()
      .option('--input', { leaf: false })
      .command('run', { leaf: true })
      .parse(['run', 'build', '--input', 'src']);
    [actual] = createNodes({
      type: 'command',
      children: [
        {
          id: 'run',
          name: 'run',
          raw: 'run',
          key: 'run',
          type: 'command',
          args: ['build']
        },
        {
          id: '--input',
          name: '--input',
          raw: '--input',
          key: '--input',
          args: ['src'],
          children: [
            {
              id: '--input',
              name: '--input',
              raw: '--input',
              key: '--input',
              type: 'value',
              args: ['src']
            }
          ]
        }
      ]
    });
    expect(root).to.deep.equal(actual);
  });

  it("should run 'init' once when `schema.parse()` is called", () => {
    const called: string[] = [];
    const actual: string[] = [];
    const cmd = command({
      init(schema) {
        called.push('root');
        expect(schema).to.equal(cmd);
      }
    });
    expect(called).to.deep.equal(actual);

    cmd.parse([]);
    actual.push('root');
    expect(called).to.deep.equal(actual);

    cmd.parse([]);
    expect(called).to.deep.equal(actual);
  });

  it("should run 'init' once when `schema.schemas()` is called", () => {
    const called: string[] = [];
    const actual: string[] = [];
    const cmd = command({
      init(schema) {
        called.push('root');
        expect(schema).to.equal(cmd);
      }
    });
    expect(called).to.deep.equal(actual);

    cmd.schemas();
    actual.push('root');
    expect(called).to.deep.equal(actual);

    cmd.schemas();
    expect(called).to.deep.equal(actual);
  });

  it("should run 'init' once when schemas are added and only when they are parsed", () => {
    const called: string[] = [];
    const actual: string[] = [];
    const cmd = command({
      init(schema) {
        called.push('root');
        expect(schema).to.equal(cmd);
      }
    });
    expect(called).to.deep.equal(actual);

    cmd.option('--input', {
      init(schema) {
        called.push('--input');
        expect(schema).to.be.an('object').that.is.an.instanceOf(SchemaClass);
      }
    });
    actual.push('root');
    expect(called).to.deep.equal(actual);

    cmd.option('--output', {
      init(schema) {
        called.push('--output');
        expect(schema).to.be.an('object').that.is.an.instanceOf(SchemaClass);
      }
    });
    cmd.command('run', {
      init(run) {
        called.push('run');
        expect(run).to.be.an('object').that.is.an.instanceOf(SchemaClass);

        run.option('--if-present', {
          init(schema) {
            called.push('--if-present');
            expect(schema)
              .to.be.an('object')
              .that.is.an.instanceOf(SchemaClass);
          }
        });
      }
    });

    expect(called).to.deep.equal(actual);

    cmd.parse(['--input']);
    actual.push('--input');
    expect(called).to.deep.equal(actual);

    cmd.parse(['run', '--output']);
    actual.push('run');
    expect(called).to.deep.equal(actual);

    cmd.parse(['--output', '--input']);
    actual.push('--output');
    expect(called).to.deep.equal(actual);

    cmd.parse(['--input', '--output', 'run', '--if-present']);
    actual.push('--if-present');
    expect(called).to.deep.equal(actual);
  });

  it("should run the 'handler' as fallback", () => {
    let called = 0;
    const cmd = command({
      parser(arg, ctx) {
        called++;

        expect(arg).to.deep.equal({
          raw: '--fallback=0',
          key: '--fallback',
          value: '0'
        } satisfies Arg);

        const [actualNode] = createNodes({
          type: 'command',
          children: [
            {
              id: '--input',
              name: '--input',
              raw: '--input=1',
              key: '--input',
              value: '1',
              args: ['1']
            }
          ]
        });

        expect(ctx).to.deep.equal({
          min: null,
          max: null,
          read: true,
          schema: cmd,
          node: actualNode
        } satisfies Context);
      }
    })
      .option('--input')
      .command('run');

    expect(called).to.equal(0);

    cmd.parse(['--input=1']);
    expect(called).to.equal(0);

    cmd.parse(['--input=1', '--fallback=0', 'run', '--fallback']);
    expect(called).to.equal(1);
  });

  // TODO: handler
  // TODO: callback options
});
