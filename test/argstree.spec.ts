import { expect } from 'chai';
import { ArgsTreeError, Options, argstree } from '../src/index.js';

function expectError(opts: {
  cause: string;
  options: Options;
  equal?: Options;
  args?: string[];
}) {
  const { args = [], cause, options, equal = options } = opts;
  expect(() => {
    try {
      argstree(args, options);
    } catch (error) {
      expect(error).to.be.instanceOf(ArgsTreeError);
      expect(error).to.have.property('cause').that.equals(cause);
      expect(error).to.have.property('options').that.equals(equal);
      throw error;
    }
  }).to.throw(ArgsTreeError);
}

describe('argstree', () => {
  it('should be a function', () => {
    expect(argstree).to.be.a('function');
  });

  it('should return a node object (root)', () => {
    const node = argstree([], {});
    expect(node).to.be.an('object');
    expect(node).to.have.property('id').that.is.null;
    expect(node).to.have.property('depth').that.is.a('number').equal(0);
    expect(node).to.have.property('args').that.is.an('array');
    expect(node).to.have.property('parent').that.is.null;
    expect(node).to.have.property('children').that.is.an('array');
    expect(node).to.have.property('ancestors').that.is.an('array');
    expect(node).to.have.property('descendants').that.is.an('array');
  });

  it('should not treat any arguments as an option or command unless specified', () => {
    const args = ['--test', 'foo', 'bar', 'baz'];
    let node = argstree(args);
    expect(node.args).to.deep.equal(args);

    node = argstree(args, { args: { '--test': {} } });
    expect(node.args).to.have.length(0);
    expect(node.children).to.have.length(1);
    expect(node.children[0].id).to.equal('--test');
    expect(node.children[0].args).to.deep.equal(['foo', 'bar', 'baz']);

    node = argstree(args, { args: { foo: {} } });
    expect(node.args).to.deep.equal(['--test']);
    expect(node.children).to.have.length(1);
    expect(node.children[0].id).to.equal('foo');
    expect(node.children[0].args).to.deep.equal(['bar', 'baz']);
  });

  it('should be variadic by default', () => {
    const nodes = [
      argstree(['--test', 'foo', 'bar', 'baz', '--test', 'foo', 'bar'], {
        args: { '--test': {} }
      }),
      argstree(['-t', 'foo', 'bar', 'baz', '-t', 'foo', 'bar'], {
        alias: { '-t': '--test' },
        args: { '--test': {} }
      })
    ];
    for (const node of nodes) {
      expect(node.args).to.have.length(0);
      expect(node.children).to.have.length(2);
      expect(node.children[0].id).to.equal('--test');
      expect(node.children[0].args).to.deep.equal(['foo', 'bar', 'baz']);
      expect(node.children[1].id).to.equal('--test');
      expect(node.children[1].args).to.deep.equal(['foo', 'bar']);
    }
  });

  it('should accept args function', () => {
    let called = false;
    const node = argstree(['--foo'], {
      args: arg => {
        called = true;
        return arg === '--foo' ? {} : null;
      }
    });
    expect(called).to.be.true;
    expect(node.children).to.have.length(1);
    expect(node.children[0].id).to.equal('--foo');
  });

  it('should accept args function (recursive)', () => {
    const args: Options['args'] = arg => (arg === '--foo' ? { args } : null);
    const node = argstree(['--foo', 'foo', '--foo', 'bar', '--foo', 'baz'], {
      args
    });
    expect(node.args).to.have.length(0);
    expect(node.children).to.have.length(1);
    expect(node.descendants).to.have.length(3);
    const match = ['foo', 'bar', 'baz'];
    for (let index = 0; index < node.descendants.length; index++) {
      const descendant = node.descendants[index];
      expect(descendant.id).to.equal('--foo');
      expect(descendant.depth).to.equal(index + 1);
      expect(descendant.args).to.deep.equal([match[index]]);
    }
  });

  it('should accept arguments of range (min)', () => {
    const args = ['foo', 'bar', 'baz'];
    const node = argstree(args, { min: args.length });
    expect(node.args).to.deep.equal(args);

    expectError({
      args,
      cause: ArgsTreeError.INVALID_RANGE_ERROR,
      options: { min: args.length + 1 }
    });

    const options = {
      args: { test: { min: args.length + 1 } }
    } satisfies Options;
    expectError({
      args: ['test'].concat(args),
      cause: ArgsTreeError.INVALID_RANGE_ERROR,
      options,
      equal: options.args.test
    });

    const options2 = {
      args: { test: { args: { bar: { min: args.length - 1 } } } }
    } satisfies Options;
    expectError({
      args: ['test'].concat(args),
      cause: ArgsTreeError.INVALID_RANGE_ERROR,
      options: options2,
      equal: options2.args.test.args.bar
    });

    const options3 = {
      min: 1,
      args: { foo: { args: { bar: { min: 1 } } } }
    } satisfies Options;
    expectError({
      args: ['foo', 'bar', 'baz'],
      cause: ArgsTreeError.INVALID_RANGE_ERROR,
      options: options3
    });
  });

  it('should accept arguments of range (max)', () => {
    const args = ['foo', 'bar', 'baz'];
    let node = argstree(args, { max: args.length });
    expect(node.args).to.deep.equal(args);

    expectError({
      args,
      cause: ArgsTreeError.INVALID_RANGE_ERROR,
      options: { max: 2 }
    });

    node = argstree(['test'].concat(args), {
      args: { test: { max: args.length - 1 } }
    });
    expect(node.args).to.deep.equal(['baz']);
    expect(node.children).to.have.length(1);
    expect(node.children[0].id).to.equal('test');
    expect(node.children[0].args).to.deep.equal(['foo', 'bar']);

    expectError({
      args: ['test'].concat(args),
      cause: ArgsTreeError.INVALID_RANGE_ERROR,
      options: { max: 0, args: { test: { max: args.length - 1 } } }
    });

    // use alias to fill max args
    const options = {
      alias: { '-t': ['--test', 'foo', 'bar', 'baz'] },
      args: { '--test': { max: 3 } }
    } satisfies Options;
    expectError({
      args: ['-t=0'],
      cause: ArgsTreeError.INVALID_RANGE_ERROR,
      options,
      equal: options.args['--test']
    });

    const options2 = {
      args: { '--foo': { max: 0, args: { bar: { args: {} } } } }
    } satisfies Options;
    expectError({
      args: ['--foo=bar', 'bar', 'baz'],
      cause: ArgsTreeError.INVALID_RANGE_ERROR,
      options: options2,
      equal: options2.args['--foo']
    });

    expectError({
      args: ['foo', 'bar'],
      cause: ArgsTreeError.INVALID_RANGE_ERROR,
      options: { max: 0, args: { foo: { max: 0 } } }
    });
  });

  it('should accept arguments of range (maxRead)', () => {
    let node = argstree(['--test', 'foo', 'bar'], {
      args: { '--test': { maxRead: 0 } }
    });
    expect(node.args).to.deep.equal(['foo', 'bar']);
    expect(node.children).to.have.length(1);
    expect(node.children[0].id).to.equal('--test');

    node = argstree(['--test=foo', 'bar'], {
      args: { '--test': { maxRead: 0 } }
    });
    expect(node.args).to.deep.equal(['bar']);
    expect(node.children).to.have.length(1);
    expect(node.children[0].id).to.equal('--test');
    expect(node.children[0].args).to.deep.equal(['foo']);

    // use alias to fill max args
    node = argstree(['-t', 'foo', 'bar'], {
      alias: { '-t': ['--test', 'foo', 'bar', 'baz'] },
      args: { '--test': { min: 3, max: 3, maxRead: 0 } }
    });
    expect(node.args).to.deep.equal(['foo', 'bar']);
    expect(node.children).to.have.length(1);
    expect(node.children[0].id).to.equal('--test');
    expect(node.children[0].args).to.deep.equal(['foo', 'bar', 'baz']);

    node = argstree(['-t=0', 'foo', 'bar'], {
      alias: { '-t': ['--test', 'foo', 'bar', 'baz'] },
      args: { '--test': { min: 4, max: 4, maxRead: 0 } }
    });
    expect(node.args).to.deep.equal(['foo', 'bar']);
    expect(node.children).to.have.length(1);
    expect(node.children[0].id).to.equal('--test');
    expect(node.children[0].args).to.deep.equal(['foo', 'bar', 'baz', '0']);
  });

  it('should not check alias args if there is a matching option or command', () => {
    const nodes = [
      argstree(['-f'], {
        alias: { '-f': '--foo' },
        args: { '--foo': {}, '-f': { id: 'bar' } }
      }),
      argstree(['-f'], {
        alias: { '-f': '--foo' },
        args: arg => (arg === '-f' ? { id: 'bar' } : null)
      })
    ];
    for (const node of nodes) {
      expect(node.args).to.have.length(0);
      expect(node.children).to.have.length(1);
      expect(node.children[0].id).to.equal('bar');
    }

    const node = argstree(['-fb'], {
      alias: { '-f': '--foo', '-b': '-f' },
      args: { '--foo': {}, '-f': { id: 'bar' } }
    });
    expect(node.args).to.have.length(0);
    expect(node.children).to.have.length(2);
    expect(node.children[0].id).to.equal('--foo');
    expect(node.children[1].id).to.equal('bar');
  });

  it('should use alias args', () => {
    let node = argstree(['-t'], {
      alias: { '-t': '--tree' },
      args: { '--tree': {} }
    });
    expect(node.children).to.have.length(1);
    expect(node.children[0].id).to.equal('--tree');

    node = argstree(['-t']);
    expect(node.args).to.deep.equal(['-t']);
    expect(node.children).to.have.length(0);

    node = argstree(['-t'], { alias: { t: 'test' }, args: { test: {} } });
    expect(node.args).to.deep.equal(['-t']);
    expect(node.children).to.have.length(0);

    node = argstree(['t'], { alias: { '-t': 'test' }, args: { test: {} } });
    expect(node.args).to.deep.equal(['t']);
    expect(node.children).to.have.length(0);

    node = argstree(['t'], { alias: { t: 'test' }, args: { test: {} } });
    expect(node.args).to.have.length(0);
    expect(node.children).to.have.length(1);
    expect(node.children[0].id).to.equal('test');
  });

  it('should not split non-option aliases', () => {
    let node = argstree(['tf'], {
      alias: { t: 'test', f: 'foo' },
      args: { test: {}, foo: {} }
    });
    expect(node.args).to.deep.equal(['tf']);
    expect(node.children).to.have.length(0);

    node = argstree(['-tf'], {
      alias: { t: 'test', f: 'foo' },
      args: { test: {}, foo: {} }
    });
    expect(node.args).to.deep.equal(['-tf']);
    expect(node.children).to.have.length(0);

    node = argstree(['-tf'], {
      alias: { '-t': 'test', '-f': 'foo' },
      args: { test: {}, foo: {} }
    });
    expect(node.args).to.have.length(0);
    expect(node.children).to.have.length(2);
    expect(node.children[0].id).to.equal('test');
    expect(node.children[1].id).to.equal('foo');

    expectError({
      args: ['-tf'],
      cause: ArgsTreeError.UNRECOGNIZED_ALIAS_ERROR,
      options: {
        alias: { '-t': 'test', f: 'foo' },
        args: { test: {}, foo: {} }
      }
    });
    expectError({
      args: ['-tf'],
      cause: ArgsTreeError.UNRECOGNIZED_ALIAS_ERROR,
      options: {
        alias: { t: 'test', '-f': 'foo' },
        args: { test: {}, foo: {} }
      }
    });
  });

  it('should not save as arg for empty array alias args', () => {
    let node = argstree(['-t'], {
      alias: { '-t': 'test' },
      args: { test: {} }
    });
    expect(node.args).to.have.length(0);
    expect(node.children).to.have.length(1);
    expect(node.children[0].id).to.equal('test');

    // force empty arrays
    const nodes = [
      argstree(['-t'], { alias: { '-t': [] as any } }),
      argstree(['-t'], { alias: { '-t': [[]] as any } })
    ];
    for (const node of nodes) {
      expect(node.args).to.have.length(0);
      expect(node.children).to.have.length(0);
    }

    node = argstree(['-t']);
    expect(node.args).to.deep.equal(['-t']);
    expect(node.children).to.have.length(0);

    node = argstree(['-t'], { alias: { '-t': null } });
    expect(node.args).to.deep.equal(['-t']);
    expect(node.children).to.have.length(0);
  });

  it('should not immediately validate range for split args', () => {
    const options = {
      min: 2,
      alias: { '-f': '--foo', '-b': '--bar' },
      args: { '--foo': { max: 0 }, '--bar': { max: 0 } }
    } satisfies Options;
    const tree = argstree(['-fb', 'foo', 'bar'], options);
    expect(tree.args).to.deep.equal(['foo', 'bar']);
    expect(tree.children).to.have.length(2);
    expect(tree.children[0].id).to.equal('--foo');
    expect(tree.children[1].id).to.equal('--bar');

    options.min++;
    expectError({
      args: ['-fb', 'foo', 'bar'],
      cause: ArgsTreeError.INVALID_RANGE_ERROR,
      options
    });
  });

  it('should properly split aliases with more than one character', () => {
    let node = argstree(['-abbaa'], {
      alias: { '-a': 'test', '-b': 'bar', '-ba': 'baz', '-aa': 'foo' },
      args: { test: {}, bar: {}, baz: {}, foo: {} }
    });
    expect(node.children).to.have.length(4);
    let ids = ['test', 'bar', 'baz', 'test'];
    ids.forEach((id, index) => {
      expect(node.children[index].id).to.equal(id);
    });

    node = argstree(['-abbaa'], {
      alias: { '-a': 'test', '-b': 'bar', '-aa': 'foo', '-ba': 'baz' },
      args: { test: {}, bar: {}, baz: {}, foo: {} }
    });
    expect(node.children).to.have.length(4);
    ids = ['test', 'bar', 'bar', 'foo'];
    ids.forEach((id, index) => {
      expect(node.children[index].id).to.equal(id);
    });
  });

  it('should treat the first value of alias arguments as an option or value', () => {
    expect(() => {
      argstree(['-t'], { alias: { '-t': '--test' }, args: { '--test': {} } });
      argstree(['-t'], { alias: { '-t': ['--test'] }, args: { '--test': {} } });
      argstree(['-t'], {
        alias: { '-t': ['--test', 'foo', 'bar'] },
        args: { '--test': {} }
      });
      argstree(['-t'], {
        alias: { '-t': ['foo', '--test', 'bar'] },
        args: { foo: {} }
      });
    }).to.not.throw(ArgsTreeError);

    expectError({
      args: ['-t'],
      cause: ArgsTreeError.UNRECOGNIZED_ARGUMENT_ERROR,
      options: { alias: { '-t': 'foo' }, args: { '--test': {} } }
    });
    expectError({
      args: ['-t'],
      cause: ArgsTreeError.UNRECOGNIZED_ARGUMENT_ERROR,
      options: {
        alias: { '-t': ['foo', 'bar', '--test'] },
        args: { '--test': {} }
      }
    });
    expectError({
      args: ['-t'],
      cause: ArgsTreeError.UNRECOGNIZED_ARGUMENT_ERROR,
      options: { alias: { '-t': ['foo', '--test'] }, args: { '--test': {} } }
    });
  });

  it('should treat the rest of the values of alias arguments as values', () => {
    let node = argstree(['-t'], {
      alias: { '-t': ['--test', 'foo', 'bar'] },
      args: { '--test': {}, foo: {}, bar: {} }
    });
    expect(node.children).be.have.length(1);
    expect(node.descendants).be.have.length(1);
    expect(node.children[0]).to.have.property('id').that.equals('--test');
    expect(node.children[0].args)
      .to.be.an('array')
      .that.deep.equals(['foo', 'bar']);

    node = argstree(['-t', 'f', 'b', '-t=baz', 'test'], {
      alias: {
        '-t': ['--test', 'foo', 'bar'],
        f: ['foo', '--test', 'foo', 'bar'],
        b: 'bar'
      },
      args: { '--test': {}, foo: {}, bar: {} }
    });
    expect(node.children).be.have.length(4);
    expect(node.descendants).be.have.length(4);

    expect(node.children[0].id).to.equal('--test');
    expect(node.children[0].args)
      .to.be.an('array')
      .that.deep.equals(['foo', 'bar']);

    expect(node.children[1].id).to.equal('foo');
    expect(node.children[1].args)
      .to.be.an('array')
      .that.deep.equals(['--test', 'foo', 'bar']);

    expect(node.children[2].id).to.equal('bar');
    expect(node.children[2].args).to.be.an('array').with.length(0);

    expect(node.children[3].id).to.equal('--test');
    expect(node.children[3].args)
      .to.be.an('array')
      .that.deep.equals(['foo', 'bar', 'baz', 'test']);
  });

  it('should handle multiple alias args', () => {
    const nodes = [
      argstree(['-f'], {
        alias: {
          '-f': [
            ['--foo', 'bar', 'baz'],
            ['--bar', 'foo', 'baz'],
            ['--baz', 'foo', 'bar']
          ]
        },
        args: { '--foo': {}, '--bar': {}, '--baz': {} }
      }),
      argstree(['-f'], {
        // force both string and string array
        alias: {
          '-f': [
            ['--foo', 'bar', 'baz'],
            '--bar',
            ['--baz', 'foo', 'bar'],
            'foo',
            'baz'
          ] as any
        },
        args: { '--foo': {}, '--bar': {}, '--baz': {} }
      })
    ];
    for (const node of nodes) {
      expect(node.args).to.have.length(0);
      expect(node.children).to.have.length(3);
      expect(node.children[0].id).to.equal('--foo');
      expect(node.children[0].args).to.deep.equal(['bar', 'baz']);

      expect(node.children[1].id).to.equal('--bar');
      expect(node.children[1].args).to.deep.equal(['foo', 'baz']);

      expect(node.children[2].id).to.equal('--baz');
      expect(node.children[2].args).to.deep.equal(['foo', 'bar']);
    }
  });

  it('should save extra alias arguments to last available option', () => {
    // force empty arrays
    const nodes = [
      argstree(['-fb=bar', 'baz'], {
        alias: { '-f': '--foo', '-b': [] as any },
        args: { '--foo': {} }
      }),
      argstree(['-fb=bar', 'baz'], {
        alias: { '-f': '--foo', '-b': [[]] as any },
        args: { '--foo': {} }
      })
    ];
    for (const node of nodes) {
      expect(node.args).to.have.length(0);
      expect(node.children).to.have.length(1);
      expect(node.children[0].id).to.equal('--foo');
      expect(node.children[0].args).to.deep.equal(['bar', 'baz']);
    }
  });

  it('should save split aliases to parent node and allow them to have args (subcommand like)', () => {
    const options = {
      alias: { '-f': '--foo', '-b': '--baz', '-ba': '--bar' },
      args: {
        '--foo': { args: { test: {} } },
        '--bar': { args: { test: {} } },
        '--baz': { args: { test: {} } }
      }
    } satisfies Options;

    const items = [
      {
        ids: ['--foo', '--bar', '--baz'],
        node: argstree(['-fbab=0', 'test'], options)
      },
      {
        ids: ['--foo', '--baz', '--bar'],
        node: argstree(['-fbba=0', 'test'], options)
      }
    ];
    for (const item of items) {
      const { node, ids } = item;
      expect(node.args).to.have.length(0);
      expect(node.children).to.have.length(3);
      expect(node.descendants).to.have.length(4);

      expect(node.children[0].id).to.equal(ids[0]);
      expect(node.children[0].args).to.have.length(0);

      expect(node.children[1].id).to.equal(ids[1]);
      expect(node.children[1].args).to.have.length(0);

      expect(node.children[2].id).to.equal(ids[2]);
      expect(node.children[2].args).to.deep.equal(['0']);
      expect(node.children[2].children).to.have.length(1);
      expect(node.children[2].children[0].id).to.equal('test');
    }
  });

  it('should handle errors from split aliases with args', () => {
    const options = {
      alias: { '-f': '--foo', '-b': '--baz', '-ba': '--bar' },
      args: {
        '--foo': { min: 2, args: { test: { min: 1 } } },
        '--bar': { min: 1, args: {} },
        '--baz': { args: {} }
      }
    } satisfies Options;
    expectError({
      args: ['-fbba=0'],
      cause: ArgsTreeError.INVALID_RANGE_ERROR,
      options,
      equal: options.args['--foo']
    });
    expectError({
      args: ['-bbaf=0'],
      cause: ArgsTreeError.INVALID_RANGE_ERROR,
      options,
      equal: options.args['--bar']
    });
    expectError({
      args: ['-bf=foo', 'bar', 'test'],
      cause: ArgsTreeError.INVALID_RANGE_ERROR,
      options,
      equal: options.args['--foo'].args.test
    });
  });

  it('should handle possibly common case for `__proto__`', () => {
    expect(argstree(['__proto__']).args).to.deep.equal(['__proto__']);
    expect(argstree(['__proto__'], { args: {} }).args).to.deep.equal([
      '__proto__'
    ]);
    expect(
      argstree(['__proto__'], { args: arg => ({}[arg]) }).args
    ).to.deep.equal(['__proto__']);
  });

  it('should not split equal sign for `--` (special case)', () => {
    let node = argstree(['foo', '--', 'bar', 'baz'], { args: { '--': {} } });
    expect(node.args).to.be.an('array').that.deep.equals(['foo']);
    expect(node.children[0].args)
      .to.be.an('array')
      .that.deep.equals(['bar', 'baz']);

    node = argstree(['foo', '--=bar', 'baz'], { args: { '--': {} } });
    expect(node.args)
      .to.be.an('array')
      .that.deep.equals(['foo', '--=bar', 'baz']);
    expect(node.children).to.be.an('array').with.length(0);
  });

  it('should not parse `=` separately if first expression is not a valid option or command', () => {
    let node = argstree(['--foo=bar']);
    expect(node.args).to.be.an('array').that.deep.equals(['--foo=bar']);
    expect(node.children).to.have.length(0);

    node = argstree(['--foo=bar'], { args: { '--foo': {} } });
    expect(node.args).to.be.an('array').with.length(0);
    expect(node.children).to.have.length(1);
    expect(node.children[0].id).to.equal('--foo');
    expect(node.children[0].args).to.be.an('array').that.deep.equals(['bar']);
  });

  it('should handle `assign` option when parsing `=`', () => {
    let node = argstree(['--foo=bar', 'baz'], {
      args: { '--foo': { assign: false } }
    });
    expect(node.args).to.deep.equal(['--foo=bar', 'baz']);
    expect(node.children).to.have.length(0);

    const args = ['foo=bar', 'baz'];
    const nodes = [argstree(args), argstree(args, { args: { foo: {} } })];
    for (const node of nodes) {
      expect(node.args).to.deep.equal(args);
      expect(node.children).to.have.length(0);
    }

    node = argstree(args, { args: { foo: { assign: true } } });
    expect(node.args).to.have.length(0);
    expect(node.children).to.have.length(1);
    expect(node.children[0].id).to.equal('foo');
    expect(node.children[0].args).to.deep.equal(['bar', 'baz']);

    node = argstree(['--=foo', 'bar'], { args: { '--': { assign: true } } });
    expect(node.args).to.have.length(0);
    expect(node.children).to.have.length(1);
    expect(node.children[0].id).to.equal('--');
    expect(node.children[0].args).to.deep.equal(['foo', 'bar']);
  });

  it('should handle `assign` option when parsing `=` for aliases', () => {
    const node = argstree(
      ['-f=0', 'f=0', '-b=0', 'b=0', '-f2=0', 'f2=0', '-b2=0', 'b2=0'],
      {
        alias: {
          '-f': '--foo',
          f: '--foo',
          '-b': '--bar',
          b: '--bar',
          '-f2': 'foo',
          f2: 'foo',
          '-b2': 'bar',
          b2: 'bar'
        },
        args: {
          '--foo': { maxRead: 0 },
          '--bar': { maxRead: 0, assign: false },
          foo: { maxRead: 0 },
          bar: { maxRead: 0, assign: true }
        }
      }
    );
    expect(node.args).to.deep.equal(['-b=0', 'b=0', '-f2=0', 'f2=0']);
    expect(node.children).to.have.length(4);
    const match = ['--foo', '--foo', 'bar', 'bar'];
    node.children.forEach((child, index) => {
      expect(child.id).to.equal(match[index]);
      expect(child.args).to.deep.equal(['0']);
    });
  });

  it('should not parse `=` for combined aliases if last option is not assignable', () => {
    // force empty arrays
    const options = {
      alias: {
        '-f': '--foo',
        '-b': '--bar',
        '-ba': '--baz',
        '-z': [] as any,
        '-zz': [[]] as any
      },
      args: { '--foo': {}, '--bar': { assign: false }, '--baz': {} }
    } as Options;

    let node = argstree(['-fbab=bar', 'baz'], options);
    expect(node.args).to.deep.equal(['-fbab=bar', 'baz']);
    expect(node.children).to.have.length(0);

    node = argstree(['-fbabz=bar', 'baz'], options);
    expect(node.args).to.deep.equal(['-fbabz=bar', 'baz']);
    expect(node.children).to.have.length(0);

    node = argstree(['-fbabzz=bar', 'baz'], options);
    expect(node.args).to.deep.equal(['-fbabzz=bar', 'baz']);
    expect(node.children).to.have.length(0);

    node = argstree(['-zbazzbzzf=bar', 'baz'], options);
    expect(node.args).to.have.length(0);
    expect(node.children).to.have.length(3);

    expect(node.children[0].id).to.equal('--baz');
    expect(node.children[0].args).to.have.length(0);

    expect(node.children[1].id).to.equal('--bar');
    expect(node.children[1].args).to.have.length(0);

    expect(node.children[2].id).to.equal('--foo');
    expect(node.children[2].args).to.deep.equal(['bar', 'baz']);
  });

  it('should run `validate` option', () => {
    const called = { root: false, child: false };
    const args = ['--foo', 'bar', 'baz'];
    const options = {
      id: 'root',
      args: {
        '--foo': {
          id: 'foo',
          max: 1,
          validate(data) {
            called.child = true;
            expect(data).to.be.an('object');
            expect(data.raw).to.equal('--foo');
            expect(data.options).to.equal(options.args['--foo']);
            expect(data.args).to.deep.equal(['bar']);
            return true;
          }
        }
      },
      validate(data) {
        called.root = true;
        expect(data).to.be.an('object');
        expect(data.raw).to.be.null;
        expect(data.options).to.equal(options);
        expect(data.args).to.deep.equal(['baz']);
        return true;
      }
    } satisfies Options;
    argstree(args, options);
    expect(called.root).to.be.true;
    expect(called.child).to.be.true;
  });

  it('should throw an error for validation', () => {
    const called = { root: false, child: false };
    expectError({
      args: ['--foo'],
      cause: ArgsTreeError.VALIDATE_ERROR,
      options: {
        args: { '--foo': { validate: () => (called.child = true) } },
        validate: () => !(called.root = true)
      }
    });
    expect(called.root).to.be.true;
    expect(called.child).to.be.true;

    called.root = called.child = false;
    const options2 = {
      args: { '--foo': { validate: () => !(called.child = true) } },
      validate: () => (called.root = true)
    } satisfies Options;
    expectError({
      args: ['--foo'],
      cause: ArgsTreeError.VALIDATE_ERROR,
      options: options2,
      equal: options2.args['--foo']
    });
    expect(called.root).to.be.false;
    expect(called.child).to.be.true;
  });

  it('should throw an error for invalid options', () => {
    expectError({
      cause: ArgsTreeError.INVALID_OPTIONS_ERROR,
      options: { min: 1, max: 0 }
    });

    const options = { args: { test: { min: 2, max: 1 } } } satisfies Options;
    expectError({
      args: ['test'],
      cause: ArgsTreeError.INVALID_OPTIONS_ERROR,
      options,
      equal: options.args.test
    });
  });

  it('should throw an error for invalid range', () => {
    expect(() => argstree([], { max: 1 })).to.not.throw(ArgsTreeError);
    expect(() => argstree([], { args: { test: { max: 1 } } })).to.not.throw(
      ArgsTreeError
    );
    expectError({
      cause: ArgsTreeError.INVALID_RANGE_ERROR,
      options: { min: 1 }
    });

    const options = { args: { test: { min: 1, max: 2 } } } satisfies Options;
    expectError({
      args: ['test'],
      cause: ArgsTreeError.INVALID_RANGE_ERROR,
      options,
      equal: options.args.test
    });
  });

  it('should throw an error for unrecognized alias', () => {
    const options = {
      alias: { '-t': '--test' },
      args: {
        '--test': {},
        test: {
          alias: { '-T': '--subtest', '-y': '--y' },
          args: { '--subtest': {}, '--y': {} }
        }
      }
    } satisfies Options;

    const errOpts = {
      cause: ArgsTreeError.UNRECOGNIZED_ALIAS_ERROR,
      options,
      equal: options as Options
    };
    expect(() => argstree(['-t'], options)).to.not.throw(ArgsTreeError);
    expectError({ ...errOpts, args: ['-tx'] });
    expectError({ ...errOpts, args: ['-xt'] });
    expectError({ ...errOpts, args: ['-xty'] });

    errOpts.equal = options.args.test;
    expect(() => argstree(['test', '-T', '-Ty', '-yT'], options)).to.not.throw(
      ArgsTreeError
    );
    expectError({ ...errOpts, args: ['test', '-Tx'] });
    expectError({ ...errOpts, args: ['test', '-xT'] });
    expectError({ ...errOpts, args: ['test', '-xTy'] });
  });
});
