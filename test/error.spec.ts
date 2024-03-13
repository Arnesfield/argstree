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
    expect(ArgsTreeError.INVALID_OPTIONS_ERROR).to.be.a('string');
    expect(ArgsTreeError.INVALID_RANGE_ERROR).to.be.a('string');
    expect(ArgsTreeError.UNRECOGNIZED_ALIAS_ERROR).to.be.a('string');
    expect(ArgsTreeError.UNRECOGNIZED_ARGUMENT_ERROR).to.be.a('string');
  });

  it('should contain class members', () => {
    const options: Options = {};
    const error = new ArgsTreeError({
      cause: ArgsTreeError.INVALID_OPTIONS_ERROR,
      options,
      message: 'foo'
    });
    expect(error.cause)
      .to.be.a('string')
      .that.equals(ArgsTreeError.INVALID_OPTIONS_ERROR);
    expect(error.options).to.be.an('object').that.equals(options);
    expect(error.message).to.be.a('string').that.equals('foo');
  });
});
