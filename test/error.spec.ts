import { expect } from 'chai';
import command, {
  Node,
  Options,
  ParseError,
  SchemaOptions
} from '../src/index.js';

function expectError(opts: {
  reason: string;
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
    expect(error).to.have.property('reason').that.equals(opts.reason);
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

  it("should contain the 'reason' strings as static members", () => {
    expect(ParseError).to.have.property('OPTIONS_ERROR').that.equals('options');
    expect(ParseError).to.have.property('RANGE_ERROR').that.equals('range');
    expect(ParseError)
      .to.have.property('UNRECOGNIZED_ALIAS_ERROR')
      .that.equals('unrecognized-alias');
    expect(ParseError)
      .to.have.property('UNRECOGNIZED_ARGUMENT_ERROR')
      .that.equals('unrecognized-argument');
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
      .to.have.property('reason')
      .that.equals(ParseError.OPTIONS_ERROR);
    expect(error).to.have.property('message').that.equals('foo');
    expect(error).to.have.property('node').that.equals(node);
    expect(error).to.have.property('options').that.equals(options);
  });

  describe('options error', () => {
    it('should handle duplicate aliases', () => {
      const reason = ParseError.OPTIONS_ERROR;

      const options: Options = { alias: '-f' };
      expectError({
        reason,
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
        reason,
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
      const reason = ParseError.OPTIONS_ERROR;

      expectError({
        reason,
        args: [],
        message: 'Invalid min and max range: 1-0',
        options: { min: 1, max: 0 }
      });

      expectError({
        reason,
        args: [],
        message: 'Invalid max and maxRead range: 0 >= 1',
        options: { max: 0, maxRead: 1 }
      });
    });
  });

  describe('range error', () => {
    it("should handle errors for 'min' range option", () => {
      const reason = ParseError.RANGE_ERROR;

      expectError({
        reason,
        args: [],
        message: 'Expected at least 1 argument, but got 0.',
        options: { min: 1 }
      });

      expectError({
        reason,
        args: [],
        message: "Command 'foo' expected at least 1 argument, but got 0.",
        options: { name: 'foo', min: 1 }
      });

      const options: Options = { min: 2 };
      expectError({
        reason,
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
      const reason = ParseError.RANGE_ERROR;

      expectError({
        reason,
        args: ['foo', 'bar'],
        message: 'Expected up to 1 argument, but got 2.',
        options: { max: 1 }
      });

      expectError({
        reason,
        args: ['foo', 'bar', 'baz'],
        message: "Command 'foo' expected up to 2 arguments, but got 3.",
        options: { name: 'foo', max: 2 }
      });

      const options: Options = { max: 2, leaf: false };
      expectError({
        reason,
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
      const reason = ParseError.RANGE_ERROR;

      expectError({
        reason,
        args: ['foo'],
        message: 'Expected 0 arguments, but got 1.',
        options: { min: 0, max: 0 }
      });

      expectError({
        reason,
        args: [],
        message: 'Expected 1 argument, but got 0.',
        options: { min: 1, max: 1 }
      });

      expectError({
        reason,
        args: ['foo'],
        message: "Command 'foo' expected 2 arguments, but got 1.",
        options: { name: 'foo', min: 2, max: 2 }
      });

      const options: Options = { min: 2, max: 2, leaf: false };
      expectError({
        reason,
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
      const reason = ParseError.RANGE_ERROR;

      expectError({
        reason,
        args: ['foo', 'bar'],
        message: 'Expected 0-1 arguments, but got 2.',
        options: { min: 0, max: 1 }
      });

      expectError({
        reason,
        args: ['foo'],
        message: "Command 'foo' expected 2-3 arguments, but got 1.",
        options: { name: 'foo', min: 2, max: 3 }
      });

      const options: Options = { min: 2, max: 3 };
      expectError({
        reason,
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
      const reason = ParseError.UNRECOGNIZED_ALIAS_ERROR;

      expectError({
        reason,
        args: ['-fo'],
        message: 'Unrecognized alias: -f(o)',
        options: {
          init(schema) {
            schema.option('--foo', { alias: '-f' });
          }
        }
      });

      expectError({
        reason,
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
        reason,
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
        reason,
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
      const reason = ParseError.UNRECOGNIZED_ARGUMENT_ERROR;

      expectError({
        reason,
        args: ['foo', '-bar', '--baz'],
        message: 'Unrecognized option: -bar',
        options: { strict: 'self' }
      });

      expectError({
        reason,
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
        reason,
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
        reason,
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
  });
});
