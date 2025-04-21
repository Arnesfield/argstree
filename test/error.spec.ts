import { expect } from 'chai';
import command, { Node, Options, ParseError, SchemaOptions } from '../src';

function expectError(opts: {
  code: string;
  options: SchemaOptions;
  match?: Options;
  message: string;
  args: string[];
}) {
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
  }
}

describe('error', () => {
  it('should be a class that extends Error', () => {
    expect(ParseError).to.be.a('function');
    expect(ParseError.prototype).to.be.instanceOf(Error);
  });

  it("should contain the 'error.code' strings as static members", () => {
    expect(ParseError).to.have.property('OPTIONS_ERROR').that.equals('OPTIONS');
    expect(ParseError).to.have.property('RANGE_ERROR').that.equals('RANGE');
    expect(ParseError)
      .to.have.property('UNRECOGNIZED_ALIAS_ERROR')
      .that.equals('UNRECOGNIZED_ALIAS');
    expect(ParseError)
      .to.have.property('UNRECOGNIZED_ARGUMENT_ERROR')
      .that.equals('UNRECOGNIZED_ARGUMENT');
  });

  it('should contain class members', () => {
    const id = '--option';
    const node: Node = {
      id,
      name: id,
      raw: id,
      key: id,
      alias: null,
      type: 'option',
      depth: 1,
      args: [],
      parent: null,
      children: []
    };
    const options: Options = {};
    const error = new ParseError(
      ParseError.OPTIONS_ERROR,
      'foo',
      node,
      options
    );

    expect(error).to.be.instanceOf(Error).and.instanceOf(ParseError);
    expect(error).to.have.property('name').that.equals('ParseError');
    expect(error)
      .to.have.property('code')
      .that.equals(ParseError.OPTIONS_ERROR);
    expect(error).to.have.property('message').that.equals('foo');
    expect(error).to.have.property('node').that.equals(node);
    expect(error).to.have.property('options').that.equals(options);
  });

  describe('options error', () => {
    it('should handle duplicate aliases', () => {
      const code = ParseError.OPTIONS_ERROR;

      const options: Options = { alias: '-f' };
      expectError({
        code,
        args: [],
        message: "Option '--bar' cannot use an existing alias: -f",
        match: options,
        options: {
          init(schema) {
            schema.option('--foo', { alias: '-f' });
            schema.option('--bar', options);
          }
        }
      });

      expectError({
        code,
        args: [],
        message: "Command 'bar' cannot use an existing alias: -f",
        match: options,
        options: {
          init(schema) {
            schema.option('--foo', { alias: '-f' });
            schema.command('bar', options);
          }
        }
      });
    });

    it('should handle invalid range options', () => {
      const code = ParseError.OPTIONS_ERROR;

      expectError({
        code,
        args: [],
        message: 'Invalid min and max range: 1-0',
        options: { min: 1, max: 0 }
      });
    });
  });

  describe('range error', () => {
    it("should handle errors for 'min' range option", () => {
      const code = ParseError.RANGE_ERROR;

      expectError({
        code,
        args: [],
        message: 'Expected at least 1 argument, but got 0.',
        options: { min: 1 }
      });

      expectError({
        code,
        args: [],
        message: "Command 'foo' expected at least 1 argument, but got 0.",
        options: { name: 'foo', min: 1 }
      });

      const options: Options = { min: 2 };
      expectError({
        code,
        args: ['--foo', 'bar'],
        message: "Option '--foo' expected at least 2 arguments, but got 1.",
        match: options,
        options: {
          init(schema) {
            schema.option('--foo', options);
          }
        }
      });
    });

    it("should handle errors for 'max' range option", () => {
      const code = ParseError.RANGE_ERROR;

      expectError({
        code,
        args: ['foo', 'bar'],
        message: 'Expected up to 1 argument, but got 2.',
        options: { max: 1 }
      });

      expectError({
        code,
        args: ['foo', 'bar', 'baz'],
        message: "Command 'foo' expected up to 2 arguments, but got 3.",
        options: { name: 'foo', max: 2 }
      });

      const options: Options = { max: 2, leaf: false };
      expectError({
        code,
        args: ['--foo', 'foo', 'bar', 'baz'],
        message: "Option '--foo' expected up to 2 arguments, but got 3.",
        match: options,
        options: {
          init(schema) {
            schema.option('--foo', options);
          }
        }
      });
    });

    it('should handle errors for exact range option', () => {
      const code = ParseError.RANGE_ERROR;

      expectError({
        code,
        args: ['foo'],
        message: 'Expected 0 arguments, but got 1.',
        options: { min: 0, max: 0 }
      });

      expectError({
        code,
        args: [],
        message: 'Expected 1 argument, but got 0.',
        options: { min: 1, max: 1 }
      });

      expectError({
        code,
        args: ['foo'],
        message: "Command 'foo' expected 2 arguments, but got 1.",
        options: { name: 'foo', min: 2, max: 2 }
      });

      const options: Options = { min: 2, max: 2, leaf: false };
      expectError({
        code,
        args: ['--foo', 'foo', 'bar', 'baz'],
        message: "Option '--foo' expected 2 arguments, but got 3.",
        match: options,
        options: {
          init(schema) {
            schema.option('--foo', options);
          }
        }
      });
    });

    it("should handle errors for 'min' and 'max' range options", () => {
      const code = ParseError.RANGE_ERROR;

      expectError({
        code,
        args: ['foo', 'bar'],
        message: 'Expected 0-1 arguments, but got 2.',
        options: { min: 0, max: 1 }
      });

      expectError({
        code,
        args: ['foo'],
        message: "Command 'foo' expected 2-3 arguments, but got 1.",
        options: { name: 'foo', min: 2, max: 3 }
      });

      const options: Options = { min: 2, max: 3 };
      expectError({
        code,
        args: ['--foo', 'bar'],
        message: "Option '--foo' expected 2-3 arguments, but got 1.",
        match: options,
        options: {
          init(schema) {
            schema.option('--foo', options);
          }
        }
      });
    });
  });

  describe('unrecognized alias error', () => {
    it('should handle unrecognized alias error', () => {
      const code = ParseError.UNRECOGNIZED_ALIAS_ERROR;

      expectError({
        code,
        args: ['-fo'],
        message: 'Unrecognized alias: -f(o)',
        options: {
          init(schema) {
            schema.option('--foo', { alias: '-f' });
          }
        }
      });

      expectError({
        code,
        args: ['-foobarbaz'],
        message: 'Unrecognized aliases: -(f)oob(ar)ba(z)',
        options: {
          init(schema) {
            schema
              .option('--baz', { alias: '-ba' })
              .option('--bar', { alias: '-oob' })
              .option('--foo', { alias: '-foo' });
          }
        }
      });

      expectError({
        code,
        args: ['-fo'],
        message: "Command 'foo' does not recognize the alias: -f(o)",
        options: {
          name: 'foo',
          init(schema) {
            schema.option('--foo', { alias: '-f' });
          }
        }
      });

      expectError({
        code,
        args: ['-foobarbaz'],
        message:
          "Command 'foo' does not recognize the aliases: -(f)oob(ar)ba(z)",
        options: {
          name: 'foo',
          init(schema) {
            schema
              .option('--baz', { alias: '-ba' })
              .option('--bar', { alias: '-oob' })
              .option('--foo', { alias: '-foo' });
          }
        }
      });
    });
  });

  describe('unrecognized argument error', () => {
    it('should handle unrecognized argument error', () => {
      const code = ParseError.UNRECOGNIZED_ARGUMENT_ERROR;

      expectError({
        code,
        args: ['foo', '-bar', '--baz'],
        message: 'Unrecognized option: -bar',
        options: { strict: 'self' }
      });

      expectError({
        code,
        args: ['--foo', 'bar', '--foo=--baz', '--bar', '--baz'],
        message: "Command 'foo' does not recognize the option: --bar",
        options: {
          name: 'foo',
          strict: true,
          init(schema) {
            schema.option('--foo');
          }
        }
      });

      let options: Options = {};
      expectError({
        code,
        args: ['--foo', 'foo', '--foo=--bar', 'bar', 'baz', '--bar', '--baz'],
        message: "Command 'bar' does not recognize the option: --bar",
        match: options,
        options: {
          strict: true,
          init(schema) {
            schema.option('--foo');
            schema.command('bar', options);
          }
        }
      });

      options = { leaf: false };
      expectError({
        code,
        args: ['-f', '--foo', '--bar=--foo', 'foo', '--bar', '--baz'],
        message: "Option '--bar' does not recognize the option: --bar",
        match: options,
        options: {
          strict: 'descendants',
          init(schema) {
            schema.option('--bar', options);
          }
        }
      });
    });

    it("should handle 'read: false' option", () => {
      const code = ParseError.UNRECOGNIZED_ARGUMENT_ERROR;

      expectError({
        code,
        args: ['foo', 'bar', 'baz'],
        message: 'Expected no arguments, but got: foo',
        options: { read: false, strict: true }
      });

      expectError({
        code,
        args: ['foo', 'bar', 'baz'],
        message: 'Unrecognized option or command: foo',
        options: {
          read: false,
          strict: true,
          init(schema) {
            schema.option('--foo');
          }
        }
      });

      let options: Options = { read: false };
      expectError({
        code,
        args: ['--foo', 'bar', '--baz'],
        message: "Command 'bar' expected no arguments, but got: --baz",
        match: options,
        options: {
          strict: true,
          init(schema) {
            schema.option('--foo');
            schema.command('bar', options);
          }
        }
      });

      options = {
        read: false,
        leaf: false,
        init(schema) {
          schema.option('--baz', { read: false });
        }
      };
      expectError({
        code,
        args: ['--foo', 'bar', '--baz', 'foo'],
        message: "Option 'bar' does not recognize the option or command: foo",
        match: options,
        options: {
          strict: true,
          init(schema) {
            schema.option('--foo');
            schema.option('bar', options);
          }
        }
      });
    });
  });
});
