import { expect } from 'chai';
import command, { NodeType, option, Options, Schema, SchemaMap } from '../src';
import { Schema as SchemaClass } from '../src/schema/schema.class';

function describeSchemaFn(
  type: NodeType,
  schemaFn: (options?: Options) => Schema
) {
  describe(type, () => {
    it('should be a function', () => {
      expect(schemaFn).to.be.a('function');
    });

    it('should return a schema object', () => {
      const schema = schemaFn();
      expect(schema).to.be.an('object').that.is.an.instanceOf(SchemaClass);
      expect(schema).to.have.property('type').that.equals(type);
      expect(schema).to.have.property('options').that.is.an('object');
      expect(schema).to.have.property('option').that.is.a('function');
      expect(schema).to.have.property('command').that.is.a('function');
      expect(schema).to.have.property('schemas').that.is.a('function');
      expect(schema).to.have.property('resolve').that.is.a('function');
      expect(schema).to.have.property('parse').that.is.a('function');
    });

    it('should return itself for schema.option()', () => {
      const schema = schemaFn();
      expect(schema).to.equal(schema.option('--option'));
    });

    it('should return itself for schema.command()', () => {
      const schema = schemaFn();
      expect(schema).to.equal(schema.command('command'));
    });

    it('should return the schema map for schema.schemas()', () => {
      const options: Options = {};
      const schema = schemaFn(options);
      expect(schema).to.have.property('type').that.equals(type);
      expect(schema).to.have.property('options').that.equals(options);

      const map = schema.schemas();
      expect(map).to.be.an('object');
      expect(Object.getPrototypeOf(map)).to.be.null;
    });

    it('should have the correct schema map', () => {
      const opts = {
        root: {} satisfies Options,
        foo: { alias: '-f' } satisfies Options,
        bar: { alias: '-b' } satisfies Options,
        baz: {
          alias: '-bz',
          init(baz) {
            baz.option('--foo1');
            baz.option('--bar1');
          }
        } satisfies Options
      };

      const schema = schemaFn(opts.root)
        .option('--foo', opts.foo)
        .option('--bar', opts.bar)
        .command('baz', opts.baz);
      expect(schema).to.have.property('type').that.equals(type);
      expect(schema).to.have.property('options').that.equals(opts.root);

      const map = schema.schemas();
      expect(map).to.be.an('object');
      expect(Object.getPrototypeOf(map)).to.be.null;

      const actual: SchemaMap = {
        '--foo': option(opts.foo),
        '--bar': option(opts.bar),
        baz: command(opts.baz)
      };
      expect(map).to.deep.equal(actual);
    });
  });
}

describeSchemaFn('option', option);
describeSchemaFn('command', command);
