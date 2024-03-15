import { expect } from 'chai';
import { ArgsTreeError, Options } from '../src';

describe('error', () => {
  it('should be a class (function)', () => {
    expect(ArgsTreeError).to.be.a('function');
  });

  it('should extend to `Error`', () => {
    expect(ArgsTreeError.prototype).to.be.instanceOf(Error);
  });

  it('should contain cause strings as static members', () => {
    expect(ArgsTreeError)
      .to.have.property('INVALID_OPTIONS_ERROR')
      .that.equals('invalid-options');
    expect(ArgsTreeError)
      .to.have.property('INVALID_RANGE_ERROR')
      .that.equals('invalid-range');
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
      args,
      options
    });
    expect(error.name).to.equal('ArgsTreeError');
    expect(error.cause).to.equal(ArgsTreeError.INVALID_OPTIONS_ERROR);
    expect(error.message).to.equal('foo');
    expect(error.raw).to.equal('arg');
    expect(error.args).to.equal(args);
    expect(error.options).to.equal(options);
  });
});
