import { expect } from 'chai';
import { ArgsTreeError, Options, argstree } from '../src';

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

  it('should treat the first value of an alias argument as an option or value', () => {
    expect(() => {
      argstree(['-t'], { alias: { '-t': '--test' }, args: { '--test': {} } });
      argstree(['-t'], { alias: { '-t': ['--test'] }, args: { '--test': {} } });
      argstree(['-t'], {
        alias: { '-t': ['--test', 'foo', 'bar'] },
        args: { '--test': {} }
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

  it('should treat the rest of the values of an alias argument as values', () => {
    let tree = argstree(['-t'], {
      alias: { '-t': ['--test', 'foo', 'bar'] },
      args: { '--test': {}, foo: {}, bar: {} }
    });
    expect(tree.children).be.have.length(1);
    expect(tree.descendants).be.have.length(1);
    expect(tree.children[0]).to.have.property('id').that.equals('--test');
    expect(tree.children[0])
      .be.have.property('args')
      .that.is.an('array')
      .that.deep.equals(['foo', 'bar']);

    tree = argstree(['-t', 'f', 'b'], {
      alias: {
        '-t': ['--test', 'foo', 'bar'],
        f: ['foo', '--test', 'foo', 'bar'],
        b: 'bar'
      },
      args: { '--test': {}, foo: {}, bar: {} }
    });
    expect(tree.children).be.have.length(3);
    expect(tree.descendants).be.have.length(3);

    expect(tree.children[0]).to.have.property('id').that.equals('--test');
    expect(tree.children[0])
      .be.have.property('args')
      .that.is.an('array')
      .that.deep.equals(['foo', 'bar']);

    expect(tree.children[1]).to.have.property('id').that.equals('foo');
    expect(tree.children[1])
      .be.have.property('args')
      .that.is.an('array')
      .that.deep.equals(['--test', 'foo', 'bar']);

    expect(tree.children[2]).to.have.property('id').that.equals('bar');
    expect(tree.children[2])
      .be.have.property('args')
      .that.is.an('array')
      .with.length(0);
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

  it('should throw an error for unknown alias', () => {
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
    expectError({ ...errOpts, args: ['-xtx'] });

    errOpts.equal = options.args.test;
    expect(() => argstree(['test', '-T', '-Ty', '-yT'], options)).to.not.throw(
      ArgsTreeError
    );
    expectError({ ...errOpts, args: ['test', '-Tx'] });
    expectError({ ...errOpts, args: ['test', '-xT'] });
    expectError({ ...errOpts, args: ['test', '-xTx'] });
  });
});
