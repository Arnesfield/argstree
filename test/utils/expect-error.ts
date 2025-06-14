import { expect } from 'chai';
import command, { Options, ParseError } from '../../src';

export function expectError<T>(opts: {
  code: string;
  options: Options<T>;
  match?: Options<T>;
  message: string;
  args?: string[];
}): void {
  let error: unknown;
  const cmd = command(opts.options);
  try {
    cmd.parse(opts.args || []);
  } catch (err) {
    error = err;
  }

  expect(error).to.be.instanceof(ParseError);
  if (error instanceof ParseError) {
    expect(error).to.have.property('code');
    expect(error).to.have.property('message');
    // combine both code and message in one assertion for better logging
    expect({ code: error.code, message: error.message }).to.deep.equal({
      code: opts.code,
      message: opts.message
    });
    expect(error).to.have.property('node').that.is.an('object');
    expect(error)
      .to.have.property('options')
      .that.deep.equals(opts.match || cmd.config().options);
  }
}
