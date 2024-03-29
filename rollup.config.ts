import eslint from '@rollup/plugin-eslint';
import typescript from '@rollup/plugin-typescript';
import { createRequire } from 'module';
import { RollupOptions } from 'rollup';
import cleanup from 'rollup-plugin-cleanup';
import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import outputSize from 'rollup-plugin-output-size';
import type Pkg from './package.json';

const require = createRequire(import.meta.url);
const pkg: typeof Pkg = require('./package.json');
const input = 'src/index.ts';
const WATCH = process.env.ROLLUP_WATCH === 'true';
const PROD = !WATCH || process.env.NODE_ENV === 'production';

function defineConfig(options: (false | RollupOptions)[]) {
  return options.filter((options): options is RollupOptions => !!options);
}

export default defineConfig([
  {
    input,
    output: { file: pkg.module, format: 'esm', exports: 'named' },
    plugins: [
      esbuild({ target: 'esnext' }),
      cleanup({
        comments: ['some', 'sources', /__PURE__/],
        extensions: ['js', 'ts']
      }),
      outputSize()
    ]
  },
  {
    input,
    output: { file: pkg.types, format: 'esm' },
    plugins: [dts(), outputSize()]
  },
  !PROD && {
    input,
    watch: { skipWrite: true },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    plugins: [eslint(), typescript()]
  }
]);
