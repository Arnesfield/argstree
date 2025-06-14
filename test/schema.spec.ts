import { expect } from 'chai';
import command, { Config, option, Options, Schema, SchemaType } from '../src';
import { Schema as SchemaClass } from '../src/schema/schema.class';

function describeSchemaFn(
  type: SchemaType,
  schemaFn: (options?: Options) => Schema
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

    it('should return the config for schema.config()', () => {
      const options: Options = { min: 1, max: 1 };
      const config = schemaFn(options).config();
      expect(config).to.be.an('object');
      expect(config).to.have.property('type').that.equals(type);
      expect(config)
        .to.have.property('options')
        .that.is.an('object')
        .that.deep.equals(options);
      expect(config).to.have.property('map').that.is.an('object');
      expect(Object.getPrototypeOf(config.map)).to.be.null;
    });

    it('should return the correct config for schema.config()', () => {
      const opts = {
        root: { min: 1, max: 1 } satisfies Options,
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

      const config = schemaFn(opts.root)
        .option('--foo', opts.foo)
        .option('--bar', opts.bar)
        .command('baz', opts.baz)
        .config();
      expect(config).to.be.an('object');
      expect(config).to.have.property('type').that.equals(type);
      expect(config).to.have.property('options').that.deep.equals(opts.root);
      expect(config)
        .to.have.property('map')
        .that.deep.equals({
          '--foo': { type: 'option', options: opts.foo },
          '--bar': { type: 'option', options: opts.bar },
          baz: { type: 'command', options: opts.baz }
        } satisfies Required<Config>['map']);
    });

    it('should update the subconfig when parsed', () => {
      const cmdOpts = {
        foo: { alias: '-f' } satisfies Options,
        bar: { alias: '-b' } satisfies Options
      };
      const opts = {
        root: { max: 1 } satisfies Options,
        cmd: {
          alias: 'c',
          init(cmd) {
            cmd.option('--foo', cmdOpts.foo);
            cmd.option('--bar', cmdOpts.bar);
          }
        } satisfies Options
      };

      const schema = schemaFn(opts.root).command('cmd', opts.cmd);
      const config = schema.config();
      expect(config.map).to.deep.equal({
        cmd: { type: 'command', options: opts.cmd }
      } satisfies Required<Config>['map']);

      schema.parse(['cmd']);
      expect(config.map).to.deep.equal({
        cmd: {
          type: 'command',
          options: opts.cmd,
          map: {
            '--foo': { type: 'option', options: cmdOpts.foo },
            '--bar': { type: 'option', options: cmdOpts.bar }
          }
        }
      } satisfies Required<Config>['map']);
    });
  });
}

describeSchemaFn('option', option);
describeSchemaFn('command', command);
