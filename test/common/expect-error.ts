import { expect } from 'chai';
import command, { Node, Options, ParseError, SchemaOptions } from '../../src';

export function expectError(opts: {
  code: string;
  options: SchemaOptions;
  match?: Options;
  node?: Node;
  message: string;
  args: string[];
}): void {
  let error: unknown;
  try {
    command(opts.options).parse(opts.args);
  } catch (err) {
    error = err;
  }

  expect(error).to.be.instanceof(ParseError);
  if (error instanceof ParseError) {
    expect(error).to.have.property('code').that.equals(opts.code);
    expect(error).to.have.property('message').that.equals(opts.message);
    expect(error).to.have.property('node').that.is.an('object');
    expect(error)
      .to.have.property('options')
      .that.equals(opts.match || opts.options);

    // TODO: match node?
    if (opts.node) {
      expect(error.node).to.deep.equal(opts.node);
    }
  }
}
