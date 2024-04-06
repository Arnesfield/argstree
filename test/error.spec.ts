import { expect } from 'chai';
import argstree, { ArgsTreeError, Options } from '../src/index.js';

describe('error', () => {
  it('should be a class (function)', () => {
    expect(ArgsTreeError).to.be.a('function');
  });

  it('should extend to `Error`', () => {
    expect(ArgsTreeError.prototype).to.be.instanceOf(Error);
  });

  it('should contain cause strings as static members', () => {
    expect(ArgsTreeError)
      .to.have.property('VALIDATE_ERROR')
      .that.equals('validate');
    expect(ArgsTreeError)
      .to.have.property('INVALID_OPTIONS_ERROR')
      .that.equals('invalid-options');
    expect(ArgsTreeError)
      .to.have.property('INVALID_RANGE_ERROR')
      .that.equals('invalid-range');
    expect(ArgsTreeError)
      .to.have.property('INVALID_SPEC_ERROR')
      .that.equals('invalid-spec');
    expect(ArgsTreeError)
      .to.have.property('UNRECOGNIZED_ALIAS_ERROR')
      .that.equals('unrecognized-alias');
    expect(ArgsTreeError)
      .to.have.property('UNRECOGNIZED_ARGUMENT_ERROR')
      .that.equals('unrecognized-argument');
  });

  it('should contain class members', () => {
    const args: string[] = [];
    const options: Options = {};
    const error = new ArgsTreeError({
      cause: ArgsTreeError.INVALID_OPTIONS_ERROR,
      message: 'foo',
      raw: 'arg',
      alias: null,
      args,
      options
    });
    expect(error).to.be.instanceOf(Error);
    expect(error.name).to.equal(ArgsTreeError.name);
    expect(error.cause).to.equal(ArgsTreeError.INVALID_OPTIONS_ERROR);
    expect(error.message).to.equal('foo');
    expect(error.raw).to.equal('arg');
    expect(error.alias).to.be.null;
    expect(error.args).to.equal(args);
    expect(error.options).to.equal(options);
    expect(error.toJSON).to.be.a('function');
  });

  it('should use the option or command name in the error message', () => {
    // NOTE: this test does not check all types of errors,
    // but displayName is used consistently so we can assume
    // it works for all error cases
    try {
      argstree([], { min: 1 });
    } catch (error) {
      expect(error).to.be.instanceof(ArgsTreeError);
      if (error instanceof ArgsTreeError) {
        expect(error.message.startsWith('Expected')).to.be.true;
      }
    }

    try {
      argstree(['--foo'], { args: { '--foo': {} } });
    } catch (error) {
      expect(error).to.be.instanceof(ArgsTreeError);
      if (error instanceof ArgsTreeError) {
        expect(error.message.startsWith("Option '--foo' ")).to.be.true;
      }
    }

    try {
      argstree(['--foo'], { args: { '--foo': { name: 'bar, --foo' } } });
    } catch (error) {
      expect(error).to.be.instanceof(ArgsTreeError);
      if (error instanceof ArgsTreeError) {
        expect(error.message.startsWith("Option 'bar, --foo' ")).to.be.true;
      }
    }
  });

  it('should contain properties for toJSON', () => {
    const error = new ArgsTreeError({
      cause: ArgsTreeError.INVALID_OPTIONS_ERROR,
      message: 'foo',
      raw: 'arg',
      alias: '-a',
      args: ['bar', 'baz'],
      options: { max: 2 }
    });
    expect(error.toJSON()).to.deep.equal({
      name: ArgsTreeError.name,
      cause: ArgsTreeError.INVALID_OPTIONS_ERROR,
      message: 'foo',
      raw: 'arg',
      alias: '-a',
      args: ['bar', 'baz'],
      options: { max: 2 }
    });
  });
});
