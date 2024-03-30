import { expect } from 'chai';
import { ArgsTreeError, Options, Spec, spec } from '../src/index.js';
import { expectNode } from './argstree.spec.js';

function expectError(options: Options, handler: () => void) {
  expect(() => {
    try {
      handler();
    } catch (error) {
      expect(error).to.be.instanceOf(ArgsTreeError);
      expect(error)
        .to.have.property('cause')
        .that.equals(ArgsTreeError.INVALID_SPEC_ERROR);
      expect(error).to.have.property('options').that.equals(options);
      throw error;
    }
  }).to.throw(ArgsTreeError);
}

describe('spec', () => {
  it('should be a function', () => {
    expect(spec).to.be.a('function');
  });

  it('should return a spec object', () => {
    const cmd = spec({});
    expect(cmd).to.be.an('object');
    expect(cmd).to.have.property('option').that.is.a('function');
    expect(cmd).to.have.property('command').that.is.a('function');
    expect(cmd).to.have.property('alias').that.is.a('function');
    expect(cmd).to.have.property('spec').that.is.a('function');
    expect(cmd).to.have.property('aliases').that.is.a('function');
    expect(cmd).to.have.property('args').that.is.a('function');
    expect(cmd).to.have.property('options').that.is.a('function');
    expect(cmd).to.have.property('parse').that.is.a('function');
  });

  it('should return a node object for parse', () => {
    expectNode(spec().parse([]));
  });

  it('should build options object', () => {
    function endSpec(spec: Spec) {
      spec.command('--');
    }
    function commandSpec(spec: Spec) {
      spec.option('--help', { maxRead: 0 }).alias('-h');
    }

    const cmd = spec({ max: 0 });
    const bools = ['foo', 'bar'];
    for (const bool of bools) {
      cmd
        .option(`--${bool}`, { maxRead: 0 })
        .alias(`-${bool[0]}`)
        .alias(`--no-${bool}`, '0');
    }
    cmd
      .option('--baz', { max: 2, maxRead: 0, assign: false })
      .alias('-ba')
      .alias('--no-baz', '0');
    // setup detailed aliases
    cmd.aliases({
      '-A': [['--foo'], ['--bar']],
      '-B': [
        ['--foo', '0'],
        ['--bar', '0']
      ]
    });
    // enable allow chaining
    cmd
      // foo
      .command('foo', { min: 1 })
      .alias('f')
      .spec(endSpec)
      .spec(commandSpec)
      // foo
      .command('bar', { min: 1, assign: true, initial: ['1', '2'] })
      .alias('b')
      .spec(endSpec)
      .spec(commandSpec);
    endSpec(cmd);

    expect(cmd.options()).to.deep.equal({
      max: 0,
      args: {
        '--foo': { maxRead: 0 },
        '--bar': { maxRead: 0 },
        '--baz': { max: 2, maxRead: 0, assign: false },
        foo: {
          min: 1,
          args: { '--': { args: {} }, '--help': { maxRead: 0 } },
          alias: { '-h': '--help' }
        },
        bar: {
          min: 1,
          assign: true,
          initial: ['1', '2'],
          args: { '--': { args: {} }, '--help': { maxRead: 0 } },
          alias: { '-h': '--help' }
        },
        '--': { args: {} }
      },
      alias: {
        '-f': '--foo',
        '--no-foo': ['--foo', '0'],
        '-b': '--bar',
        '--no-bar': ['--bar', '0'],
        '-ba': '--baz',
        '--no-baz': ['--baz', '0'],
        '-A': [['--foo'], ['--bar']],
        '-B': [
          ['--foo', '0'],
          ['--bar', '0']
        ],
        f: 'foo',
        b: 'bar'
      }
    } satisfies Options);
  });

  it('should handle setting `args` function', () => {
    const cmd = spec().args();
    const options = cmd.options();
    expect(options.args).to.deep.equal({});

    let called = false;
    cmd.args(() => ((called = true), null));
    expect(options.args).to.be.a('function');
    expect(called).to.be.false;

    cmd.args();
    expect(options.args).to.be.a('function');

    cmd.parse(['--foo']);
    expect(called).to.be.true;
  });

  it('should use `args` function as fallback', () => {
    let count = 0;
    const cmd = spec()
      .option('--foo')
      .option('--bar')
      .args(arg => {
        if (arg === '--baz') {
          count++;
          return {};
        }
      });
    const node = cmd.parse(['--foo', '--baz', 'foo', '--bar', '--baz', 'foo']);
    expect(node.args).to.have.length(0);
    expect(node.children).to.have.length(4);
    expect(node.children[0].id).to.equal('--foo');
    expect(node.children[0].args).to.have.length(0);
    expect(node.children[1].id).to.equal('--baz');
    expect(node.children[1].args).to.deep.equal(['foo']);
    expect(node.children[2].id).to.equal('--bar');
    expect(node.children[2].args).to.have.length(0);
    expect(node.children[3].id).to.equal('--baz');
    expect(node.children[3].args).to.deep.equal(['foo']);
    expect(count).to.equal(2);
  });

  it('should throw an error for no current option or command', () => {
    const cmd = spec();
    const options = cmd.options();
    expectError(options, () => cmd.alias('-f'));
    expectError(options, () => cmd.spec(() => {}));
    // errors are caught, so reuse spec anyway
    cmd.option('--foo');
    const fooOptions = (options.args as Record<string, Options>)['--foo'];
    expectError(fooOptions, () => cmd.spec(foo => foo.alias('-f')));
    expectError(fooOptions, () => cmd.spec(foo => foo.spec(() => {})));
  });

  it('should throw an error for duplicate args', () => {
    const cmd = spec().option('--foo');
    expectError(cmd.options(), () => cmd.option('--foo'));

    const fooOptions = (cmd.options().args as Record<string, Options>)['--foo'];
    expectError(fooOptions, () => {
      cmd.spec(foo => foo.option('--foo').option('--foo'));
    });
  });

  it('should throw an error for duplicate aliases', () => {
    const cmd = spec();
    expectError(cmd.options(), () => {
      cmd.option('--foo').alias('-f');
      cmd.option('--bar').alias('-f');
    });

    const barOptions = (cmd.options().args as Record<string, Options>)['--bar'];
    expectError(barOptions, () => {
      cmd.spec(bar => {
        bar.option('--foo').alias('-f');
        bar.option('--bar').alias('-f');
      });
    });
  });
});
