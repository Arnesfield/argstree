import eslint from '@rollup/plugin-eslint';
import typescript from '@rollup/plugin-typescript';
import { RollupOptions } from 'rollup';
import cleanup from 'rollup-plugin-cleanup';
import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import outputSize from 'rollup-plugin-output-size';

// const PROD = process.env.NODE_ENV !== 'development';
const WATCH = process.env.ROLLUP_WATCH === 'true';
const input = 'src/index.ts';
const dir = 'lib'; // input file must be named 'index'

function defineConfig(options: (false | RollupOptions)[]) {
  return options.filter((options): options is RollupOptions => !!options);
}

export default defineConfig([
  {
    input,
    output: { dir, format: 'esm', exports: 'named' },
    plugins: [
      esbuild({
        target: 'esnext',
        // strip assertion checks
        define: { 'process.env.DEBUG': 'false' }
      }),
      cleanup({
        comments: ['some', 'sources', /__PURE__/],
        extensions: ['js', 'ts']
      }),
      outputSize({ bytes: true })
    ]
  },
  {
    input,
    output: { dir, format: 'esm' },
    plugins: [dts(), outputSize({ bytes: true })]
  },
  WATCH && {
    input,
    watch: { skipWrite: true },
    plugins: [eslint(), typescript()]
  }
]);
