import { expect } from 'chai';
import command, { Options, ResolvedArg } from '../src';

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

  // TODO: id and name
  // TODO: split
});
