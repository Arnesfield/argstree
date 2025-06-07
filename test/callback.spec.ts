import { expect } from 'chai';
import command, { Options } from '../src';
import { NodeEvent } from '../src/parser/node';
import { expectContext } from './utils/expect-context';

const events: NodeEvent<unknown>[] = [
  'onCreate',
  'onArg',
  'onChild',
  'onData',
  'onDepth',
  'onBeforeValidate',
  'onValidate'
];

/** `[event, ...node.ids]` */
type Call = [string, ...(string | null)[]];

function createOptions(): [Options, Call[]] {
  const calls: Call[] = [];
  const options: Options = {};
  for (const event of events) {
    options[event] = ctx => {
      expectContext(ctx);

      const last = calls.at(-1);
      if (last && last[0] === event) {
        last.push(ctx.node.id);
      } else {
        calls.push([event, ctx.node.id]);
      }
    };
  }
  return [options, calls];
}

describe('callback', () => {
  it('should handle events for nodes parsed multiple times', () => {
    const [options, calls] = createOptions();
    command(options)
      .option('--input', options)
      .parse(['--input', '0', '--input', '1', '2']);
    expect(calls).to.deep.equal([
      ['onCreate', null],
      ['onDepth', null],
      ['onCreate', '--input'],
      ['onChild', null],
      ['onArg', '--input'],
      ['onData', '--input'],
      ['onCreate', '--input'],
      ['onChild', null],
      ['onArg', '--input', '--input'],
      ['onData', '--input'],
      ['onDepth', '--input', '--input'],
      ['onData', null],
      ['onBeforeValidate', null, '--input', '--input'],
      ['onValidate', null, '--input', '--input']
    ]);
  });

  it('should handle nodes that cannot accept args', () => {
    const [options, calls] = createOptions();
    command(options)
      .option('--input', { ...options, read: false })
      .option('--output', { ...options, max: 0 })
      .parse(['--input', '1', '--output', '2']);
    expect(calls).to.deep.equal([
      ['onCreate', null],
      ['onDepth', null],
      ['onCreate', '--input'],
      ['onChild', null],
      ['onData', '--input'],
      ['onArg', null],
      ['onCreate', '--output'],
      ['onChild', null],
      ['onData', '--output'],
      ['onArg', null],
      ['onDepth', '--input', '--output'],
      ['onData', null],
      ['onBeforeValidate', null, '--input', '--output'],
      ['onValidate', null, '--input', '--output']
    ]);
  });

  it('should handle child nodes', () => {
    const [options, calls] = createOptions();
    command(options)
      .option('--input', options)
      .command('run', {
        ...options,
        init(run) {
          run.option('--output', options);
          run.command('subcmd', options);
        }
      })
      .parse(['--input', 'run', '--output', 'subcmd']);
    expect(calls).to.deep.equal([
      ['onCreate', null],
      ['onDepth', null],
      ['onCreate', '--input'],
      ['onChild', null],
      ['onData', '--input'],
      ['onCreate', 'run'],
      ['onChild', null],
      ['onDepth', '--input', 'run'],
      ['onData', null],
      ['onCreate', '--output'],
      ['onChild', 'run'],
      ['onData', '--output'],
      ['onCreate', 'subcmd'],
      ['onChild', 'run'],
      ['onDepth', '--output', 'subcmd'],
      ['onData', 'run', 'subcmd'],
      ['onBeforeValidate', null, '--input', 'run', '--output', 'subcmd'],
      ['onValidate', null, '--input', 'run', '--output', 'subcmd']
    ]);
  });
});
