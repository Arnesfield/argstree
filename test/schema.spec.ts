import { expect } from 'chai';
import command, {
  Aliases,
  Config,
  NodeType,
  option,
  Options,
  Schema,
  SchemaOptions
} from '../src';

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
      expect(schema).to.be.an('object');
      expect(schema).to.have.property('option').that.is.a('function');
      expect(schema).to.have.property('command').that.is.a('function');
      expect(schema).to.have.property('alias').that.is.a('function');
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

    it('should return itself for schema.alias()', () => {
      const schema = schemaFn();
      expect(schema).to.equal(schema.alias({}));
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
      expect(config).to.have.property('aliases').that.is.an('object');
      expect(Object.getPrototypeOf(config.aliases)).to.be.null;
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
        .command('baz', opts.baz)
        .alias({ '-a': [], '-b': '--bar', '-c': [] })
        .alias({
          '-a': ['--foo', 'arg1', 'arg2'],
          '-d': [
            ['--bar', 'arg1', 'arg2'],
            ['--baz', 'arg1', 'arg2']
          ]
        });
      const config = schema.config();

      expect(config).to.be.an('object');
      expect(config).to.have.property('type').that.equals(type);
      expect(config).to.have.property('options').that.equals(opts.root);

      expect(Object.getPrototypeOf(config.args)).to.be.null;
      expect(config.args).to.deep.equal({
        '--foo': { arg: '--foo', type: 'option', options: opts.foo },
        '--bar': { arg: '--bar', type: 'option', options: opts.bar },
        baz: { arg: 'baz', type: 'command', options: opts.baz }
      } as Config['args']);

      expect(Object.getPrototypeOf(config.aliases)).to.be.null;
      expect(config.aliases).to.deep.equal({
        '-a': ['--foo', 'arg1', 'arg2'],
        '-b': '--bar',
        '-c': [],
        '-d': [
          ['--bar', 'arg1', 'arg2'],
          ['--baz', 'arg1', 'arg2']
        ]
      } as Aliases);
    });
  });
}

describeSchemaFn('option', option);
describeSchemaFn('command', command);
