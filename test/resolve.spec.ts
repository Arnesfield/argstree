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
      raw: '--input',
      key: '--input',
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
      raw: 'run',
      key: 'run',
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
    const cmd = command()
      .option('--all', { alias: '-a' })
      .option('--output', { alias: '-o', assign: false })
      .command('run', {
        init(run) {
          run.option('--input');
        }
      });
    const args = ['--input', '-i=0', 'run=1', '--output=2', '-ao=3', '-bao=3'];
    for (const arg of args) {
      expect(cmd.resolve(arg), arg).to.be.undefined;
    }

    const resolved = command()
      .option('--all', { alias: '-a=' })
      .resolve('-a=2');
    expect(resolved).to.be.undefined;
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
      raw: '--input=1',
      key: '--input',
      value: '1',
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
      raw: 'run=3',
      key: 'run',
      value: '3',
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

  it('should resolve key and value', () => {
    const opts = {
      input: { min: 1, max: 1 } satisfies Options,
      output: { assign: false } satisfies Options,
      run: { assign: true } satisfies Options
    };
    const cmd = command()
      .option('--input=name', opts.input)
      .option('--output=name', opts.output)
      .command('run=name', opts.run);

    let resolved = cmd.resolve('--input=name', 'value');
    expect(resolved).to.deep.equal({
      raw: '--input=name',
      key: '--input=name',
      value: 'value',
      items: [
        {
          key: '--input=name',
          alias: null,
          type: 'option',
          options: {
            ...opts.input,
            id: '--input=name',
            name: '--input=name',
            args: ['value']
          }
        }
      ]
    } satisfies ResolvedArg);

    resolved = cmd.resolve('--output=name', null);
    expect(resolved).to.deep.equal({
      raw: '--output=name',
      key: '--output=name',
      items: [
        {
          key: '--output=name',
          alias: null,
          type: 'option',
          options: {
            ...opts.output,
            id: '--output=name',
            name: '--output=name',
            args: []
          }
        }
      ]
    } satisfies ResolvedArg);

    resolved = cmd.resolve('run=name', 'value');
    expect(resolved).to.deep.equal({
      raw: 'run=name',
      key: 'run=name',
      value: 'value',
      items: [
        {
          key: 'run=name',
          alias: null,
          type: 'command',
          options: {
            ...opts.run,
            id: 'run=name',
            name: 'run=name',
            args: ['value']
          }
        }
      ]
    } satisfies ResolvedArg);
  });

  it('should resolve aliases', () => {
    const opts = {
      input: { alias: '-i', args: 'a' } satisfies Options,
      output: { alias: '-o', args: ['0', '1'] } satisfies Options
    };
    const resolved = command()
      .option('--input', opts.input)
      .option('--output', opts.output)
      .resolve('-io=2');
    expect(resolved).to.deep.equal({
      raw: '-io=2',
      key: '-io',
      value: '2',
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

  it('should resolve single alias', () => {
    const opts = {
      all: { alias: '-a=', assign: false } satisfies Options,
      input: { alias: ['-i', '-i=0'] } satisfies Options,
      force: { alias: '-f' } satisfies Options,
      run: { args: ['0'] } satisfies Options
    };
    const cmd = command()
      .option('--all', opts.all)
      .option('--input', opts.input)
      .option('--input=0')
      .option('--force', opts.force)
      .command('run', opts.run);

    let resolved = cmd.resolve('-i=0');
    expect(resolved).to.deep.equal({
      raw: '-i=0',
      key: '-i',
      value: '0',
      items: [
        {
          key: '--input',
          alias: '-i',
          type: 'option',
          options: {
            ...opts.input,
            id: '--input',
            name: '--input',
            args: ['0']
          }
        }
      ]
    } satisfies ResolvedArg);

    resolved = cmd.resolve('-f=1');
    expect(resolved).to.deep.equal({
      raw: '-f=1',
      key: '-f',
      value: '1',
      items: [
        {
          key: '--force',
          alias: '-f',
          type: 'option',
          options: {
            ...opts.force,
            id: '--force',
            name: '--force',
            args: ['1']
          }
        }
      ]
    } satisfies ResolvedArg);

    // should return undefined as --all is not assignable
    resolved = cmd.resolve('-a=', 'value');
    expect(resolved).to.be.undefined;
  });

  it('should resolve aliases using key and value', () => {
    const cmd = command()
      .option('--all', { alias: '-a=', assign: false })
      .option('--force', { alias: ['-f=2'] })
      .option('--input', { alias: '-i' });

    let resolved = cmd.resolve('-ia=bf=2', 'value');
    expect(resolved).to.deep.equal({
      raw: '-ia=bf=2',
      key: '-ia=bf=2',
      value: 'value',
      split: createSplit(['i', 'a=', ':b', 'f=2'])
    } satisfies ResolvedArg);

    // should return undefined as --all is not assignable
    resolved = cmd.resolve('-ia=f=2a=', 'value');
    expect(resolved).to.be.undefined;
  });

  it('should resolve the key over the alias if they are equal', () => {
    const options = { min: 1 } satisfies Options;
    const resolved = command()
      .option('-i', options)
      .option('--input', { alias: '-i' })
      .resolve('-i');
    expect(resolved).to.deep.equal({
      raw: '-i',
      key: '-i',
      items: [
        {
          key: '-i',
          alias: null,
          type: 'option',
          options: { ...options, id: '-i', name: '-i', args: [] }
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
      raw: '-io=2',
      key: '-io',
      value: '2',
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
      raw: 'r',
      key: 'r',
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
    const cmd = command()
      .option('--input', { alias: '-i' })
      .option('--force', { alias: ['-f', ['--no-force', '0']], assign: false })
      .command('help', { alias: 'h' });

    let resolved = cmd.resolve('-efghi=0');
    expect(resolved).to.deep.equal({
      raw: '-efghi=0',
      key: '-efghi',
      value: '0',
      split: createSplit([':e', 'f', ':gh', 'i'])
    } satisfies ResolvedArg);

    resolved = cmd.resolve('-ifb=0');
    expect(resolved).to.deep.equal({
      raw: '-ifb=0',
      key: '-ifb',
      value: '0',
      split: createSplit(['i', 'f', ':b'])
    } satisfies ResolvedArg);
  });

  it('should not return the split result if the last matched item is not assignable', () => {
    const cmd = command()
      .option('--all', { alias: '-a=', assign: false })
      .option('--input', { alias: '-i', assign: false })
      .option('--output', { alias: '-o', assign: false });

    let resolved = cmd.resolve('-xoi=1');
    expect(resolved).to.be.undefined;

    resolved = cmd.resolve('-xoyia=', 'value');
    expect(resolved).to.be.undefined;
  });
});
