import { expect } from 'chai';
import command, { Options } from '../src';

type NodeEvent<T = unknown> = keyof {
  [K in keyof Options<T> as K extends `on${string}` ? K : never]: Options<T>[K];
};

const events: NodeEvent[] = [
  'onCreate',
  'onChild',
  'onData',
  'onBeforeValidate',
  'onValidate'
];

/** `[event, ...node.ids]` */
type Call<T = unknown> = [NodeEvent<T>, ...(string | null)[]];

function createOptions<T>(): [Options<T>, Call<T>[]] {
  const calls: Call<T>[] = [];
  const options: Options<T> = {};
  for (const event of events) {
    options[event] = node => {
      const last = calls.at(-1);
      if (last && last[0] === event) {
        last.push(node.id);
      } else {
        calls.push([event, node.id]);
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
      ['onCreate', null, '--input'],
      ['onChild', null],
      ['onData', '--input'],
      ['onCreate', '--input'],
      ['onChild', null],
      ['onData', '--input', null],
      ['onBeforeValidate', null, '--input', '--input'],
      ['onValidate', null, '--input', '--input']
    ] satisfies Call[]);
  });

  it('should handle nodes that cannot accept args', () => {
    const [options, calls] = createOptions();
    command(options)
      .option('--input', { ...options, read: false })
      .option('--output', { ...options, max: 0 })
      .parse(['--input', '1', '--output', '2']);
    expect(calls).to.deep.equal([
      ['onCreate', null, '--input'],
      ['onChild', null],
      ['onData', '--input'],
      ['onCreate', '--output'],
      ['onChild', null],
      ['onData', '--output', null],
      ['onBeforeValidate', null, '--input', '--output'],
      ['onValidate', null, '--input', '--output']
    ] satisfies Call[]);
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
      ['onCreate', null, '--input'],
      ['onChild', null],
      ['onData', '--input'],
      ['onCreate', 'run'],
      ['onChild', null],
      ['onData', null],
      ['onCreate', '--output'],
      ['onChild', 'run'],
      ['onData', '--output'],
      ['onCreate', 'subcmd'],
      ['onChild', 'run'],
      ['onData', 'run', 'subcmd'],
      ['onBeforeValidate', null, '--input', 'run', '--output', 'subcmd'],
      ['onValidate', null, '--input', 'run', '--output', 'subcmd']
    ] satisfies Call[]);
  });
});
