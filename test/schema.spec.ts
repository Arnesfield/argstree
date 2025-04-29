import { expect } from 'chai';
import command, {
  Config,
  NodeType,
  option,
  Options,
  Schema,
  SchemaOptions
} from '../src';
import { Schema as SchemaClass } from '../src/schema/schema.class';

function describeSchemaFn(
  type: NodeType,
  schemaFn: (options?: SchemaOptions) => Schema
) {
  describe(type, () => {
    it('should be a function', () => {
      expect(schemaFn).to.be.a('function');
    });

    it('should return a schema object', () => {
      const schema = schemaFn();
      expect(schema).to.be.an('object').that.is.an.instanceOf(SchemaClass);
      expect(schema).to.have.property('option').that.is.a('function');
      expect(schema).to.have.property('command').that.is.a('function');
      expect(schema).to.have.property('config').that.is.a('function');
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

    it('should return the config for schema.config()', () => {
      const options: Options = {};
      const schema = schemaFn(options);
      const config = schema.config();
      expect(config).to.be.an('object');
      expect(config).to.have.property('type').that.is.a('string');
      expect(config).to.have.property('options').that.equals(options);
      expect(config).to.have.property('args').that.is.an('object');
      expect(Object.getPrototypeOf(config.args)).to.be.null;
    });

    it('should have the correct config', () => {
      const opts = {
        root: {} as Options,
        foo: { alias: '-f' } as Options,
        bar: { alias: '-b' } as Options,
        baz: {
          alias: '-bz',
          init(baz) {
            baz.option('--foo1');
            baz.option('--bar1');
          }
        } as Options
      };

      const schema = schemaFn(opts.root)
        .option('--foo', opts.foo)
        .option('--bar', opts.bar)
        .command('baz', opts.baz);
      const config = schema.config();

      expect(config).to.be.an('object');
      expect(config).to.have.property('type').that.equals(type);
      expect(config).to.have.property('options').that.equals(opts.root);

      const args: Config['args'] = {
        '--foo': { type: 'option', options: opts.foo },
        '--bar': { type: 'option', options: opts.bar },
        baz: { type: 'command', options: opts.baz }
      };
      expect(Object.getPrototypeOf(config.args)).to.be.null;
      expect(config.args).to.deep.equal(args);
    });
  });
}

describeSchemaFn('option', option);
describeSchemaFn('command', command);
