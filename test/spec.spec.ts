import { expect } from 'chai';
import { ArgsTreeError, Options, Spec, spec } from '../src/index.js';
import { expectNode } from './argstree.spec.js';

function relationSpec() {
  const cmd = spec();
  const matches = ['foo', 'bar', 'baz'];
  for (const match of matches) {
    cmd.command(match).spec(cmd => {
      cmd.command(`sub${match}`).spec(cmd => cmd.option(`--${match}`));
    });
  }
  return { cmd, matches };
}

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

  it('should return a spec object (root spec)', () => {
    const cmd = spec({});
    expect(cmd).to.be.an('object');
    expect(cmd).to.have.property('id').to.be.null;
    expect(cmd).to.have.property('depth').to.equal(0);
    expect(cmd).to.have.property('option').that.is.a('function');
    expect(cmd).to.have.property('command').that.is.a('function');
    expect(cmd).to.have.property('alias').that.is.a('function');
    expect(cmd).to.have.property('spec').that.is.a('function');
    expect(cmd).to.have.property('aliases').that.is.a('function');
    expect(cmd).to.have.property('args').that.is.a('function');
    expect(cmd).to.have.property('options').that.is.a('function');
    expect(cmd).to.have.property('parse').that.is.a('function');
    expect(cmd).to.have.property('parent').that.is.a('function');
    expect(cmd).to.have.property('children').that.is.a('function');
    expect(cmd).to.have.property('ancestors').that.is.a('function');
    expect(cmd).to.have.property('descendants').that.is.a('function');
  });

  it('should return a node object for parse', () => {
    expectNode(spec().parse([]));
  });

  it('should build options object', () => {
    function endSpec(spec: Spec) {
      spec.command('--', { strict: false });
    }
    function commandSpec(spec: Spec) {
      spec.option('--help', { maxRead: 0 }).alias('-h');
    }

    const cmd = spec({ max: 0, strict: true });
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
      // bar
      .command('bar', {
        min: 1,
        strict: false,
        assign: true,
        initial: ['1', '2']
      })
      .alias('b')
      .spec(endSpec)
      .spec(commandSpec);
    endSpec(cmd);

    expect(cmd.options()).to.deep.equal({
      max: 0,
      strict: true,
      args: {
        '--foo': { maxRead: 0 },
        '--bar': { maxRead: 0 },
        '--baz': { max: 2, maxRead: 0, assign: false },
        foo: {
          min: 1,
          args: { '--': { strict: false, args: {} }, '--help': { maxRead: 0 } },
          alias: { '-h': '--help' }
        },
        bar: {
          min: 1,
          strict: false,
          assign: true,
          initial: ['1', '2'],
          args: { '--': { strict: false, args: {} }, '--help': { maxRead: 0 } },
          alias: { '-h': '--help' }
        },
        '--': { strict: false, args: {} }
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

  it('should not use properties from prototype', () => {
    let errorNth = 0;
    try {
      // attempt to override validation (possibly access data)
      Object.assign(Object.prototype, {
        name: 'evil',
        validate: () => false
      } satisfies Options);

      // internally, the provided options is set to another
      // the provided options object is unsafe, make sure to clean it
      spec({}).command('test').parse(['test']);

      // should not error, check name
      try {
        spec({ min: 1 }).parse([]);
      } catch (error) {
        errorNth = 1;
        // this check does not apply for argstree
        // since options object reference is preserved in error
        // but for spec, the options object is controlled
        expect(error).to.be.instanceOf(ArgsTreeError);
        if (error instanceof ArgsTreeError) {
          expect(error.options.name).to.be.undefined;
        }
      }
    } catch (error) {
      errorNth = 2;
    } finally {
      // clean up
      for (const prop of ['name', 'validate']) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete Object.prototype[prop];
      }
    }

    // should not have thrown an error from prototype.validate
    expect(errorNth).to.equal(1);
  });

  it('should get the parent spec object', () => {
    const { cmd } = relationSpec();
    expect(cmd.parent()).to.be.null;
    expect(cmd.depth).to.equal(0);

    const [child, descendant] = cmd.descendants();
    expect(child.id).to.equal('foo');
    expect(child.depth).to.equal(1);
    expect(child.parent()).to.equal(cmd);

    expect(descendant.id).to.equal('subfoo');
    expect(descendant.depth).to.equal(2);
    expect(descendant.parent()).to.equal(child);
  });

  it('should list all children spec objects', () => {
    const { cmd, matches } = relationSpec();
    const children = cmd.children();
    expect(children).to.be.an('array').that.has.length(3);
    children.forEach((child, index) => {
      expect(child.id).to.equal(matches[index]);
      expect(child.depth).to.equal(cmd.depth + 1);
    });
  });

  it('should list all ancestor spec objects', () => {
    const { cmd } = relationSpec();
    expect(cmd.ancestors()).to.be.an('array').that.has.length(0);

    const descendant = cmd.descendants()[2];
    expect(descendant.id).to.equal('--foo');
    expect(descendant.depth).to.equal(3);

    const ancestors = descendant.ancestors();
    expect(ancestors).to.be.an('array').that.has.length(3);
    [null, 'foo', 'subfoo'].forEach((match, index) => {
      expect(ancestors[index].id).to.equal(match);
      expect(ancestors[index].depth).to.equal(index);
    });
  });

  it('should list all descendant spec objects', () => {
    const { cmd, matches } = relationSpec();
    const descendants = cmd.descendants();
    expect(descendants).to.be.an('array').that.has.length(9);
    const all: string[] = [];
    for (const match of matches) {
      all.push(match, `sub${match}`, `--${match}`);
    }
    descendants.forEach((child, index) => {
      expect(child.id).to.equal(all[index]);
      expect(child.depth).to.equal((child.parent() || cmd).depth + 1);
    });
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
      cmd.spec(foo => foo.option('--bar').option('--bar'));
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
