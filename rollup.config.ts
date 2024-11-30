import _eslint from '@rollup/plugin-eslint';
import _typescript from '@rollup/plugin-typescript';
import { PluginImpl, RollupOptions } from 'rollup';
import cleanup from 'rollup-plugin-cleanup';
import _dts, { Options as RollupPluginDtsOptions } from 'rollup-plugin-dts';
import _esbuild, {
  Options as RollupPluginEsbuildOptions
} from 'rollup-plugin-esbuild';
import outputSize from 'rollup-plugin-output-size';
import pkg from './package.json' with { type: 'json' };

// NOTE: remove once import errors are fixed for their respective packages
const dts = _dts as unknown as PluginImpl<RollupPluginDtsOptions>;
const esbuild = _esbuild as unknown as PluginImpl<RollupPluginEsbuildOptions>;
const eslint = _eslint as unknown as typeof _eslint.default;
const typescript = _typescript as unknown as typeof _typescript.default;

// const PROD = process.env.NODE_ENV !== 'development';
const WATCH = process.env.ROLLUP_WATCH === 'true';
const input = 'src/index.ts';

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
  WATCH && {
    input,
    watch: { skipWrite: true },
    plugins: [eslint(), typescript()]
  }
]);
