import { expect } from 'chai';
import command, { option, Options, ParseError } from '../src';
import { createNodes } from './utils/create-nodes';
import { expectError } from './utils/expect-error';

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
    const [node] = createNodes({ id, name: id, raw: id, key: id, depth: 1 });
    const schema = command();
    const error = new ParseError(ParseError.OPTIONS_ERROR, 'foo', node, schema);

    expect(error).to.be.instanceOf(Error).and.instanceOf(ParseError);
    expect(error).to.have.property('name').that.equals('ParseError');
    expect(error)
      .to.have.property('code')
      .that.equals(ParseError.OPTIONS_ERROR);
    expect(error).to.have.property('message').that.equals('foo');
    expect(error).to.have.property('schema').that.equals(schema);
    expect(error).to.have.property('node').that.equals(node);
  });

  describe('options error', () => {
    it('should handle duplicate aliases', () => {
      const code = ParseError.OPTIONS_ERROR;

      let options: Options = { alias: '-f' };
      expectError({
        code,
        args: [],
        message: "Option '--bar' cannot use an existing alias: -f",
        match: option(options),
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
        match: command(options),
        options: {
          init(schema) {
            schema.option('--foo', { alias: '-f' });
            schema.command('bar', options);
          }
        }
      });

      options = { ...options, name: null };
      expectError({
        code,
        args: [],
        message: 'Cannot use an existing alias: -f',
        match: option(options),
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
        message: 'Cannot use an existing alias: -f',
        match: command(options),
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

      expectError({
        code,
        args: [],
        message: "Command 'foo' has invalid min and max range: 2-0",
        options: { name: 'foo', min: 2, max: 0 }
      });

      const match = option({ min: 3, max: 1 });
      match.schemas();
      expectError({
        code,
        args: ['--foo'],
        message: "Option '--foo' has invalid min and max range: 3-1",
        match,
        options: {
          init(schema) {
            schema.option('--foo', match.options);
          }
        }
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

      const match = option({ min: 2 });
      match.schemas();
      expectError({
        code,
        args: ['--foo', 'bar'],
        message: "Option '--foo' expected at least 2 arguments, but got 1.",
        match,
        options: {
          init(schema) {
            schema.option('--foo', match.options);
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

      const match = option({ max: 2, leaf: false });
      match.schemas();
      expectError({
        code,
        args: ['--foo', 'foo', 'bar', 'baz'],
        message: "Option '--foo' expected up to 2 arguments, but got 3.",
        match,
        options: {
          init(schema) {
            schema.option('--foo', match.options);
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

      const match = option({ min: 2, max: 2, leaf: false });
      match.schemas();
      expectError({
        code,
        args: ['--foo', 'foo', 'bar', 'baz'],
        message: "Option '--foo' expected 2 arguments, but got 3.",
        match,
        options: {
          init(schema) {
            schema.option('--foo', match.options);
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

      const match = option({ min: 2, max: 3 });
      match.schemas();
      expectError({
        code,
        args: ['--foo', 'bar'],
        message: "Option '--foo' expected 2-3 arguments, but got 1.",
        match,
        options: {
          init(schema) {
            schema.option('--foo', match.options);
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

      const match = option({
        init(schema) {
          schema
            .option('--baz', { alias: '-ba' })
            .option('--bar', { alias: '-oob' })
            .option('--foo', { alias: '-foo' });
        }
      });
      match.schemas();
      expectError({
        code,
        args: ['--foo', '-foobarbaz'],
        message:
          "Option '--foo' does not recognize the aliases: -(f)oob(ar)ba(z)",
        match,
        options: {
          init(schema) {
            schema.option('--foo', match.options);
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
            schema.option('--foo', { max: 1 });
          }
        }
      });

      let match = command();
      match.schemas();
      expectError({
        code,
        args: ['--foo', 'foo', '--foo=--bar', 'bar', 'baz', '--bar', '--baz'],
        message: "Command 'bar' does not recognize the option: --bar",
        match,
        options: {
          strict: true,
          init(schema) {
            schema.option('--foo');
            schema.command('bar', match.options);
          }
        }
      });

      // option with no child nodes
      match = option({ strict: true });
      match.schemas();
      expectError({
        code,
        args: ['-f', '--foo', '--bar', '--baz'],
        message: "Option '--foo' does not recognize the option: --bar",
        match,
        options: {
          strict: 'descendants',
          init(schema) {
            schema.option('--foo', match.options);
          }
        }
      });

      // option with child nodes
      match = option({ leaf: false });
      match.schemas();
      expectError({
        code,
        args: ['-f', '--foo', '--bar=--foo', 'foo', '--bar', '--baz'],
        message: "Option '--bar' does not recognize the option: --bar",
        match,
        options: {
          strict: 'descendants',
          init(schema) {
            schema.option('--bar', match.options);
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

      let match = command({ read: false });
      match.schemas();
      expectError({
        code,
        args: ['--foo', 'bar', '--baz'],
        message: "Command 'bar' expected no arguments, but got: --baz",
        match,
        options: {
          strict: true,
          init(schema) {
            schema.option('--foo');
            schema.command('bar', match.options);
          }
        }
      });

      match = option({
        read: false,
        init(schema) {
          schema.option('--baz', { read: false });
        }
      });
      const map = match.schemas();
      map['--baz'].schemas();
      expectError({
        code,
        args: ['--foo', 'bar', '--baz', 'foo'],
        message: "Option 'bar' does not recognize the option or command: foo",
        match,
        options: {
          strict: true,
          init(schema) {
            schema.option('--foo');
            schema.option('bar', match.options);
          }
        }
      });
    });
  });
});
