import { expect } from 'chai';
import command, { Options, ResolvedArg } from '../src';
import { createSplit } from './utils/create-split';

describe('resolve', () => {
  it('should resolve the matching option or command', () => {
    const opts = {
      input: { min: 1, max: 1 } satisfies Options,
      run: { args: ['0'] } satisfies Options
    };
    const cmd = command()
      .option('--input', opts.input)
      .command('run', opts.run);

    let resolved = cmd.resolve('--input');
    expect(resolved).to.deep.equal({
      items: [
        {
          key: '--input',
          alias: null,
          type: 'option',
          options: { ...opts.input, id: '--input', name: '--input', args: [] }
        }
      ]
    } satisfies ResolvedArg);

    resolved = cmd.resolve('run');
    expect(resolved).to.deep.equal({
      items: [
        {
          key: 'run',
          alias: null,
          type: 'command',
          options: { ...opts.run, id: 'run', name: 'run', args: ['0'] }
        }
      ]
    } satisfies ResolvedArg);
  });

  it('should return undefined if the argument cannot be resolved', () => {
    const cmd = command().command('run', {
      init(run) {
        run.option('--input');
      }
    });
    const args = ['--input', '-i=0', 'run=1'];
    for (const arg of args) {
      expect(cmd.resolve(arg)).to.be.undefined;
    }
  });

  it('should resolve assigned values', () => {
    const opts = {
      input: { min: 1, max: 1, args: '0' } satisfies Options,
      run: { assign: true } satisfies Options
    };
    const cmd = command()
      .option('--input', opts.input)
      .command('run', opts.run);

    let resolved = cmd.resolve('--input=1');
    expect(resolved).to.deep.equal({
      items: [
        {
          key: '--input',
          alias: null,
          type: 'option',
          options: {
            ...opts.input,
            id: '--input',
            name: '--input',
            args: ['0', '1']
          }
        }
      ]
    } satisfies ResolvedArg);

    resolved = cmd.resolve('run=3');
    expect(resolved).to.deep.equal({
      items: [
        {
          key: 'run',
          alias: null,
          type: 'command',
          options: { ...opts.run, id: 'run', name: 'run', args: ['3'] }
        }
      ]
    } satisfies ResolvedArg);
  });

  it('should resolve aliases', () => {
    const opts = {
      input: { alias: '-i', args: 'a' } satisfies Options,
      output: { alias: '-o', args: ['0', '1'] } satisfies Options
    };
    const cmd = command()
      .option('--input', opts.input)
      .option('--output', opts.output);

    const resolved = cmd.resolve('-io=2');
    expect(resolved).to.deep.equal({
      items: [
        {
          key: '--input',
          alias: '-i',
          type: 'option',
          options: {
            ...opts.input,
            id: '--input',
            name: '--input',
            args: ['a']
          }
        },
        {
          key: '--output',
          alias: '-o',
          type: 'option',
          options: {
            ...opts.output,
            id: '--output',
            name: '--output',
            args: ['0', '1', '2']
          }
        }
      ]
    } satisfies ResolvedArg);
  });

  it("should not override 'id' and 'name' options", () => {
    const opts = {
      input: {
        id: 'INPUT',
        name: 'input',
        alias: '-i',
        args: 'a'
      } satisfies Options,
      output: {
        id: null,
        name: null,
        alias: '-o',
        args: ['0', '1']
      } satisfies Options,
      run: {
        id: 'RUN',
        name: 'run-cmd',
        alias: 'r',
        args: ['0']
      } satisfies Options
    };

    const cmd = command()
      .option('--input', opts.input)
      .option('--output', opts.output)
      .command('run', opts.run);

    let resolved = cmd.resolve('-io=2');
    expect(resolved).to.deep.equal({
      items: [
        {
          key: '--input',
          alias: '-i',
          type: 'option',
          options: { ...opts.input, args: ['a'] }
        },
        {
          key: '--output',
          alias: '-o',
          type: 'option',
          options: { ...opts.output, args: ['0', '1', '2'] }
        }
      ]
    } satisfies ResolvedArg);

    resolved = cmd.resolve('r');
    expect(resolved).to.deep.equal({
      items: [
        {
          key: 'run',
          alias: 'r',
          type: 'command',
          options: { ...opts.run, args: ['0'] }
        }
      ]
    } satisfies ResolvedArg);
  });

  it('should return the split result for unresolved alias', () => {
    const resolved = command()
      .option('--input', { alias: '-i' })
      .option('--force', { alias: ['-f', ['--no-force', '0']] })
      .command('help', { alias: 'h' })
      .resolve('-efghi=0');

    expect(resolved).to.deep.equal({
      split: createSplit([':e', 'f', ':gh', 'i'])
    } satisfies ResolvedArg);
  });
});
