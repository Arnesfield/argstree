import { expect } from 'chai';
import { Context } from '../../src';
import { Schema as SchemaClass } from '../../src/schema/schema.class';

export function expectContext<T>(ctx: Context<T>): void {
  expect(ctx).to.have.property('min');
  expect(ctx).to.have.property('max');
  expect(ctx).to.have.property('read');
  expect(ctx).to.have.property('node').that.is.an('object');
  expect(ctx).to.have.property('schema').that.is.an.instanceOf(SchemaClass);
}
