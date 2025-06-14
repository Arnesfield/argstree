import { expect } from 'chai';
import { Arg, Options, ParseError } from '../src';
import { createNodes } from './utils/create-nodes';
import { createSplit } from './utils/create-split';
import { expectError } from './utils/expect-error';

describe('error', () => {
  it('should be a class that extends Error', () => {
    expect(ParseError).to.be.a('function');
    expect(ParseError.prototype).to.be.instanceOf(Error);
  });

  it("should contain the 'error.code' strings as static members", () => {
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
    const options: Options = {};
    const error = new ParseError(
      ParseError.UNRECOGNIZED_ARGUMENT_ERROR,
      'foo',
      node,
      options
    );

    expect(error).to.be.instanceOf(Error).and.instanceOf(ParseError);
    expect(error).to.have.property('name').that.equals('ParseError');
    expect(error)
      .to.have.property('code')
      .that.equals(ParseError.UNRECOGNIZED_ARGUMENT_ERROR);
    expect(error).to.have.property('message').that.equals('foo');
    expect(error).to.have.property('node').that.equals(node);
    expect(error).to.have.property('options').that.equals(options);
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

      const match: Options = { min: 2 };
      expectError({
        code,
        args: ['--foo', 'bar'],
        message: "Option '--foo' expected at least 2 arguments, but got 1.",
        match,
        options: {
          init(schema) {
            schema.option('--foo', match);
          }
        }
      });
    });

    it("should handle errors for 'max' range option", () => {
      const code = ParseError.RANGE_ERROR;

      expectError({
        code,
        message: "Command 'foo' expected up to 2 arguments, but got 3.",
        options: { name: 'foo', max: 2, args: ['foo', 'bar', 'baz'] }
      });

      const match: Options = {
        max: 2,
        leaf: false,
        args: ['foo', 'bar', 'baz']
      };
      expectError({
        code,
        args: ['--foo'],
        message: "Option '--foo' expected up to 2 arguments, but got 3.",
        match,
        options: {
          init(schema) {
            schema.option('--foo', match);
          }
        }
      });
    });

    it('should handle errors for exact range option', () => {
      const code = ParseError.RANGE_ERROR;

      expectError({
        code,
        message: 'Expected 0 arguments, but got 1.',
        options: { min: 0, max: 0, args: ['foo'] }
      });

      expectError({
        code,
        message: 'Expected 1 argument, but got 0.',
        options: { min: 1, max: 1 }
      });

      expectError({
        code,
        args: ['foo'],
        message: "Command 'foo' expected 2 arguments, but got 1.",
        options: { name: 'foo', min: 2, max: 2 }
      });

      const match: Options = {
        min: 2,
        max: 2,
        leaf: false,
        args: ['foo', 'bar', 'baz']
      };
      expectError({
        code,
        args: ['--foo'],
        message: "Option '--foo' expected 2 arguments, but got 3.",
        match,
        options: {
          init(schema) {
            schema.option('--foo', match);
          }
        }
      });
    });

    it("should handle errors for 'min' and 'max' range options", () => {
      const code = ParseError.RANGE_ERROR;

      expectError({
        code,
        args: ['foo'],
        message: "Command 'foo' expected 2-3 arguments, but got 1.",
        options: { name: 'foo', min: 2, max: 3 }
      });

      const match: Options = { min: 2, max: 3 };
      expectError({
        code,
        args: ['--foo', 'bar'],
        message: "Option '--foo' expected 2-3 arguments, but got 1.",
        match,
        options: {
          init(schema) {
            schema.option('--foo', match);
          }
        }
      });
    });

    it("should handle 'strict' option for child nodes", () => {
      const code = ParseError.RANGE_ERROR;
      const match: Options = { min: 1 };
      expectError({
        code,
        args: ['-f', '--foo', 'bar', '--bar', '--baz'],
        message: "Option '--bar' expected at least 1 argument, but got 0.",
        match,
        options: {
          strict: 'descendants',
          init(schema) {
            schema.option('--foo', match);
            schema.option('--bar', match);
          }
        }
      });
    });
  });

  describe('unrecognized alias error', () => {
    it('should throw unrecognized alias error', () => {
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

      const match: Options = {
        init(schema) {
          schema
            .option('--baz', { alias: '-ba' })
            .option('--bar', { alias: '-oob' })
            .option('--foo', { alias: '-foo' });
        }
      };
      expectError({
        code,
        args: ['--foo', '-foobarbaz'],
        message:
          "Option '--foo' does not recognize the aliases: -(f)oob(ar)ba(z)",
        match,
        options: {
          init(schema) {
            schema.option('--foo', match);
          }
        }
      });
    });

    it("should throw unrecognized alias error after 'parser' option", () => {
      const code = ParseError.UNRECOGNIZED_ALIAS_ERROR;

      let called = 0;
      expectError({
        code,
        args: ['-efghi=value'],
        message: 'Unrecognized aliases: -(e)f(gh)i',
        options: {
          init(schema) {
            schema
              .option('--input', { alias: '-i' })
              .option('--force', { alias: ['-f'] })
              .command('help', { alias: 'h' });
          },
          parser(arg) {
            called++;
            expect(arg).to.deep.equal({
              raw: '-efghi=value',
              key: '-efghi',
              value: 'value',
              split: createSplit([':e', 'f', ':gh', 'i'])
            } satisfies Arg);
          }
        }
      });

      expect(called).to.equal(1);
    });
  });

  describe('unrecognized argument error', () => {
    it('should throw unrecognized argument error', () => {
      const code = ParseError.UNRECOGNIZED_ARGUMENT_ERROR;

      expectError({
        code,
        args: ['foo'],
        message: 'Unrecognized argument: foo',
        options: { max: 0 }
      });

      expectError({
        code,
        args: ['baz'],
        message: 'Unrecognized argument: baz',
        options: { max: 2, args: ['foo', 'bar'] }
      });

      expectError({
        code,
        args: ['foo', '-bar', '--baz'],
        message: 'Unrecognized argument: -bar',
        options: { strict: 'self' }
      });

      expectError({
        code,
        args: ['--foo', 'bar', '--foo=--baz', '--bar', '--baz'],
        message: "Command 'foo' does not recognize the argument: --bar",
        options: {
          name: 'foo',
          strict: true,
          init(schema) {
            schema.option('--foo', { max: 1 });
          }
        }
      });

      let match: Options = {};
      expectError({
        code,
        args: ['--foo', 'foo', '--foo=--bar', 'bar', 'baz', '--bar', '--baz'],
        message: "Command 'bar' does not recognize the argument: --bar",
        match,
        options: {
          strict: true,
          init(schema) {
            schema.option('--foo');
            schema.command('bar', match);
          }
        }
      });

      // option with child nodes
      match = { leaf: false };
      expectError({
        code,
        args: ['-f', '--foo', '--bar=--foo', 'foo', '--bar', '--baz'],
        message: "Option '--bar' does not recognize the argument: --bar",
        match,
        options: {
          strict: 'descendants',
          init(schema) {
            schema.option('--bar', match);
          }
        }
      });
    });

    it("should handle 'read: false' option", () => {
      const code = ParseError.UNRECOGNIZED_ARGUMENT_ERROR;

      expectError({
        code,
        args: ['foo', 'bar', 'baz'],
        message: 'Unrecognized argument: foo',
        options: { read: false }
      });

      expectError({
        code,
        args: ['foo', 'bar', 'baz'],
        message: 'Unrecognized argument: foo',
        options: {
          read: false,
          init(schema) {
            schema.option('--foo');
          }
        }
      });

      let match: Options = { read: false };
      expectError({
        code,
        args: ['--foo', 'bar', '--baz'],
        message: "Command 'bar' does not recognize the argument: --baz",
        match,
        options: {
          strict: true,
          init(schema) {
            schema.option('--foo');
            schema.command('bar', match);
          }
        }
      });

      match = {
        read: false,
        init(schema) {
          schema.option('--baz', { read: false });
        }
      };
      expectError({
        code,
        args: ['--foo', 'bar', '--baz', 'foo'],
        message: "Option 'bar' does not recognize the argument: foo",
        match,
        options: {
          strict: true,
          init(schema) {
            schema.option('--foo');
            schema.option('bar', match);
          }
        }
      });
    });

    it("should handle strict values from 'parser' option", () => {
      const code = ParseError.UNRECOGNIZED_ARGUMENT_ERROR;

      expectError({
        code,
        args: ['foo'],
        message: 'Unrecognized argument: --foo',
        options: {
          strict: true,
          parser(arg) {
            return [{ args: `--${arg.raw}` }];
          }
        }
      });

      expectError({
        code,
        args: ['foo=bar'],
        message: 'Unrecognized argument: -foo',
        options: {
          init(schema) {
            schema.option('--foo', { alias: '-f' });
          },
          parser(arg) {
            return [
              { args: `--${arg.raw}` },
              { args: [arg.raw, `-${arg.key}`], strict: true }
            ];
          }
        }
      });
    });
  });
});
