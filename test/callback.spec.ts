import { expect } from 'chai';
import command, { Options } from '../src';
import { NodeEvent } from '../src/parser/node';

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
      const last = calls[calls.length - 1] as Call | undefined;
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
  it('should handle nodes that cannot accept args', () => {
    const [options, calls] = createOptions();
    command(options)
      .option('--flag1', { ...options, read: false })
      .option('--flag2', { ...options, max: 0 })
      .parse(['--flag1', '1', '--flag2', '2']);
    expect(calls).to.deep.equal([
      ['onCreate', null],
      ['onDepth', null],
      ['onCreate', '--flag1'],
      ['onChild', null],
      ['onData', '--flag1'],
      ['onArg', null],
      ['onCreate', '--flag2'],
      ['onChild', null],
      ['onData', '--flag2'],
      ['onArg', null],
      ['onDepth', '--flag1', '--flag2'],
      ['onData', null],
      ['onBeforeValidate', null, '--flag1', '--flag2'],
      ['onValidate', null, '--flag1', '--flag2']
    ]);
  });

  it('should handle child nodes', () => {
    const [options, calls] = createOptions();
    command(options)
      .option('--flag', options)
      .command('cmd', {
        ...options,
        init(cmd) {
          cmd.option('--subflag', options);
          cmd.command('subcmd', options);
        }
      })
      .parse(['--flag', 'cmd', '--subflag', 'subcmd']);
    expect(calls).to.deep.equal([
      ['onCreate', null],
      ['onDepth', null],
      ['onCreate', '--flag'],
      ['onChild', null],
      ['onData', '--flag'],
      ['onCreate', 'cmd'],
      ['onChild', null],
      ['onDepth', '--flag', 'cmd'],
      ['onData', null],
      ['onCreate', '--subflag'],
      ['onChild', 'cmd'],
      ['onData', '--subflag'],
      ['onCreate', 'subcmd'],
      ['onChild', 'cmd'],
      ['onDepth', '--subflag', 'subcmd'],
      ['onData', 'cmd', 'subcmd'],
      ['onBeforeValidate', null, '--flag', 'cmd', '--subflag', 'subcmd'],
      ['onValidate', null, '--flag', 'cmd', '--subflag', 'subcmd']
    ]);
  });
});
