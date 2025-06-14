import { expect } from 'chai';
import command, { Arg, Config, NodeType, option, Schema } from '../src';
import { Schema as SchemaClass } from '../src/schema/schema.class';
import { createNodes } from './utils/create-nodes';

describe('parse', () => {
  it('should return the root node', () => {
    let root = command().parse([]);
    let [expected] = createNodes({ type: 'command' });
    expect(root).to.deep.equal(expected);

    root = option().parse([]);
    [expected] = createNodes();
    expect(root).to.deep.equal(expected);
  });

  it("should fallback to 'key' for undefined options 'id' and 'name'", () => {
    const root = command()
      .option('--input')
      .command('run', { id: undefined, name: undefined })
      .parse(['--input', 'run']);
    const [expected] = createNodes({
      type: 'command',
      children: [
        { id: '--input', name: '--input', raw: '--input', key: '--input' },
        { id: 'run', name: 'run', raw: 'run', key: 'run', type: 'command' }
      ]
    });
    expect(root).to.deep.equal(expected);
  });

  it("should use the provided 'id' and 'name' options", () => {
    let root = command({ id: null, name: null }).parse([]);
    let [expected] = createNodes({ id: null, name: null, type: 'command' });
    expect(root).to.deep.equal(expected);

    root = command({ id: 'root', name: 'root-name' })
      .option('--input', { id: 'INPUT', name: 'input' })
      .option('--output', { id: null, name: null })
      .command('run', { id: 'RUN', name: 'run-cmd' })
      .parse(['--input', '--output', 'run']);
    [expected] = createNodes({
      id: 'root',
      name: 'root-name',
      type: 'command',
      children: [
        { id: 'INPUT', name: 'input', raw: '--input', key: '--input' },
        { id: null, name: null, raw: '--output', key: '--output' },
        { id: 'RUN', name: 'run-cmd', raw: 'run', key: 'run', type: 'command' }
      ]
    });
    expect(root).to.deep.equal(expected);
  });

  it('should not be strict by default', () => {
    // NOTE: strict checks are part of the error spec
    const fns: { fn: typeof command; type: NodeType }[] = [
      { fn: command, type: 'command' },
      { fn: option, type: 'option' }
    ];

    for (const { fn, type } of fns) {
      let root = fn().command('cmd').parse(['--foo', 'cmd', '--bar']);
      let [expected] = createNodes({
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
      expect(root).to.deep.equal(expected);

      root = fn({ strict: false }).parse(['foo', '--bar', '-baz']);
      [expected] = createNodes({
        type,
        args: ['foo', '--bar', '-baz'],
        children: [{ type: 'value', args: ['foo', '--bar', '-baz'] }]
      });
      expect(root).to.deep.equal(expected);
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
    const [expected] = createNodes({
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
    expect(root).to.deep.equal(expected);
  });

  it('should override existing options or commands', () => {
    const schema = command()
      .option('--foo', { alias: '-f' })
      .option('--foo', { id: 'FOO' })
      .command('bar', { id: 'BAR' })
      .command('bar', { alias: 'b' });

    const config = schema.config();
    const expectedConfig: Config = {
      type: 'command',
      options: {},
      map: {
        '--foo': { type: 'option', options: { id: 'FOO' } },
        bar: { type: 'command', options: { alias: 'b' } }
      }
    };
    expect(Object.getPrototypeOf(config.map)).to.be.null;
    expect(config).to.deep.equal(expectedConfig);

    const root = schema.parse(['--foo', 'bar']);
    const [expected] = createNodes({
      type: 'command',
      children: [
        { id: 'FOO', name: '--foo', raw: '--foo', key: '--foo' },
        { id: 'bar', name: 'bar', raw: 'bar', key: 'bar', type: 'command' }
      ]
    });
    expect(root).to.deep.equal(expected);
  });

  it('should save initial arguments', () => {
    const root = command({ args: ['foo', 'bar'] })
      .option('--foo', { args: ['1', '2'] })
      .command('cmd', { args: ['arg1'] })
      .parse(['--foo=3', '4', 'cmd', 'arg2', '--foo=3']);
    const [expected] = createNodes({
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
    expect(root).to.deep.equal(expected);
  });

  it('should not use options.args as node.args', () => {
    const cmd = command({ args: ['0'] }).option('--input', { args: ['src'] });
    const root = cmd.parse(['1', '2', '--input', 'test']);
    const config = cmd.config();
    const [expected] = createNodes({
      type: 'command',
      args: ['0', '1', '2'],
      children: [
        { type: 'value', args: ['1', '2'] },
        {
          id: '--input',
          name: '--input',
          raw: '--input',
          key: '--input',
          args: ['src', 'test']
        }
      ]
    });
    expect(root).to.deep.equal(expected);
    expect(config.options.args).to.deep.equal(['0']);
    expect(config.map['--input'].options.args).to.deep.equal(['src']);
  });

  it('should not split short options', () => {
    const root = command()
      .option('-i')
      .option('-o')
      .option('-n')
      .command('n')
      .parse(['-ion']);
    const [expected] = createNodes({
      type: 'command',
      args: ['-ion'],
      children: [{ type: 'value', args: ['-ion'] }]
    });
    expect(root).to.deep.equal(expected);
  });

  it('should handle aliases and their args', () => {
    const root = command()
      .option('--foo', { alias: '-f' })
      .option('--bar', { alias: ['-ba', ['-b', '4']], args: ['2', '3'] })
      .command('foo', { alias: 'f', args: '1' })
      .parse(['-f=0', '1', '-b', '5', 'f', '2', '3', '-b=4']);
    const [expected] = createNodes({
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
    expect(root).to.deep.equal(expected);
  });

  it('should split aliases and use their args', () => {
    const root = command()
      .option('--input', { alias: ['i', ['-i', '2']], args: ['0', '1'] })
      .option('--interactive', { alias: ['in', ['-in', '3']], args: '2' })
      .option('--dry-run', { alias: ['--n', ['-n', '5']], args: ['3', '4'] })
      .parse(['-nini=3', '4', '--xnini']);
    const [expected] = createNodes({
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
    expect(root).to.deep.equal(expected);
  });

  it('should ignore empty aliases', () => {
    const root = command()
      .option('--input', { alias: [] })
      .option('--output', { alias: [[], [], []] })
      .parse(['--input', '--output']);
    const [expected] = createNodes({
      type: 'command',
      children: [
        { id: '--input', name: '--input', raw: '--input', key: '--input' },
        { id: '--output', name: '--output', raw: '--output', key: '--output' }
      ]
    });
    expect(root).to.deep.equal(expected);
  });

  it('should prioritize matching arguments over similar aliases', () => {
    const root = command()
      .option('-i')
      .option('--input', { alias: ['-i', 'run'] })
      .option('--output', { alias: '-o' })
      .command('run', { alias: '--input' })
      .parse(['-i', '0', '-io', '--input', 'run']);
    const [expected] = createNodes({
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
    expect(root).to.deep.equal(expected);
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
    const [expected] = createNodes({
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
    expect(root).to.deep.equal(expected);
  });

  it("should not 'read' when set to false", () => {
    // NOTE: read errors are part of the error spec
    const root = command()
      .option('--help', { read: false })
      .parse(['--help', 'value']);
    const [expected] = createNodes({
      type: 'command',
      args: ['value'],
      children: [
        { id: '--help', name: '--help', raw: '--help', key: '--help' },
        { type: 'value', args: ['value'] }
      ]
    });
    expect(root).to.deep.equal(expected);
  });

  it("should handle default 'assign' option", () => {
    const cmd = command()
      .option('--input', { alias: '-i' })
      .command('run', { alias: 'r' });

    let root = cmd.parse(['--input=0', 'run=1']);
    let [expected] = createNodes({
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
    expect(root).to.deep.equal(expected);

    root = cmd.parse(['-ii=0', 'r=1']);
    [expected] = createNodes({
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
    expect(root).to.deep.equal(expected);
  });

  it("should handle 'assign' option", () => {
    const cmd = command()
      .option('--input', { alias: '-i', assign: false })
      .command('run', { alias: 'r', assign: true });

    let root = cmd.parse(['--input=0', 'run=1']);
    let [expected] = createNodes({
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
    expect(root).to.deep.equal(expected);

    root = cmd.parse(['-ii=0', 'r=1']);
    [expected] = createNodes({
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
    expect(root).to.deep.equal(expected);
  });

  it("should handle 'leaf' option", () => {
    // assume default leaf option is handled by other cases
    let root = command({ leaf: true }).option('--input').parse(['--input']);
    let [expected] = createNodes({
      type: 'command',
      args: ['--input'],
      children: [{ type: 'value', args: ['--input'] }]
    });
    expect(root).to.deep.equal(expected);

    root = command()
      .option('--input', { leaf: false })
      .command('run', { leaf: true })
      .parse(['run', 'build', '--input', 'src']);
    [expected] = createNodes({
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
    expect(root).to.deep.equal(expected);
  });

  it("should run 'init' once the schema is created", () => {
    const called: string[] = [];
    const expected: string[] = [];
    let initSchema: Schema | undefined;
    const cmd = command({
      init(schema) {
        called.push('root');
        initSchema = schema;
      }
    });

    expect(cmd).to.equal(initSchema);

    expected.push('root');
    expect(called).to.deep.equal(expected);

    cmd.parse([]);
    expect(called).to.deep.equal(expected);
  });

  it("should run 'init' once and only when the schemas are parsed", () => {
    const called: string[] = [];
    const expected: string[] = [];
    const cmd = command({
      init() {
        called.push('root');
      }
    });
    expected.push('root');
    expect(called).to.deep.equal(expected);

    cmd.option('--input', {
      init(schema) {
        called.push('--input');
        expect(schema).to.be.an('object').that.is.an.instanceOf(SchemaClass);
      }
    });
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

    expect(called).to.deep.equal(expected);

    cmd.parse(['--input']);
    expected.push('--input');
    expect(called).to.deep.equal(expected);

    cmd.parse(['run', '--output']);
    expected.push('run');
    expect(called).to.deep.equal(expected);

    cmd.parse(['--output', '--input']);
    expected.push('--output');
    expect(called).to.deep.equal(expected);

    cmd.parse(['--input', '--output', 'run', '--if-present']);
    expected.push('--if-present');
    expect(called).to.deep.equal(expected);
  });

  it("should run the 'parser' as fallback", () => {
    let called = 0;
    const cmd = command({
      parser(arg, node) {
        called++;

        expect(arg).to.deep.equal({
          raw: '--fallback=0',
          key: '--fallback',
          value: '0',
          split: undefined
        } satisfies Arg);

        const [expectedNode] = createNodes({
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

        expect(node).to.deep.equal(expectedNode);
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

  it("should handle schemas and values from the 'parser' callback option", () => {
    const cmd = command({
      parser(arg) {
        if (arg.key === '--input') {
          return option({
            args: arg.value != null ? [arg.value, 'value'] : []
          });
        }

        if (arg.value == null && arg.key === 'run') {
          return command({
            strict: true,
            parser(arg) {
              if (arg.key === '--output') {
                return option({ args: arg.value });
              }
              if (arg.raw === '--input') {
                return [
                  { args: 'input' },
                  { args: [`${arg.raw}-value`, 'value'], strict: false }
                ];
              }
            }
          });
        }
      }
    });
    const root = cmd.parse(['--input=src', 'run', '--output', '--input']);
    const [expected] = createNodes({
      type: 'command',
      children: [
        {
          id: '--input',
          name: '--input',
          raw: '--input=src',
          key: '--input',
          args: ['src', 'value']
        },
        {
          id: 'run',
          name: 'run',
          raw: 'run',
          key: 'run',
          type: 'command',
          children: [
            {
              id: '--output',
              name: '--output',
              raw: '--output',
              key: '--output',
              args: ['input', '--input-value', 'value']
            }
          ]
        }
      ]
    });
    expect(root).to.deep.equal(expected);
  });

  it("should allow updating the parse options for 'onCreate' callback option", () => {
    const cmd = command()
      .option('--input', {
        onCreate(node) {
          return { read: node.args.length === 0 };
        }
      })
      .option('--output', {
        min: 3,
        max: 5,
        onCreate() {
          return { min: 1, max: 2 };
        }
      });

    let args = '--input index.js package.json --input=src lib';
    let root = cmd.parse(args.split(' '));
    let [expected] = createNodes({
      type: 'command',
      args: ['lib'],
      children: [
        {
          id: '--input',
          name: '--input',
          raw: '--input',
          key: '--input',
          args: ['index.js', 'package.json']
        },
        {
          id: '--input',
          name: '--input',
          raw: '--input=src',
          key: '--input',
          value: 'src',
          args: ['src']
        },
        { type: 'value', args: ['lib'] }
      ]
    });
    expect(root).to.deep.equal(expected);

    args = '--output src lib dist --output index.cjs index.mjs index.d.ts';
    root = cmd.parse(args.split(' '));
    [expected] = createNodes({
      type: 'command',
      args: ['dist', 'index.d.ts'],
      children: [
        {
          id: '--output',
          name: '--output',
          raw: '--output',
          key: '--output',
          args: ['src', 'lib']
        },
        { type: 'value', args: ['dist'] },
        {
          id: '--output',
          name: '--output',
          raw: '--output',
          key: '--output',
          args: ['index.cjs', 'index.mjs']
        },
        { type: 'value', args: ['index.d.ts'] }
      ]
    });
    expect(root).to.deep.equal(expected);
  });
});
