// @ts-check
import eslint from '@eslint/js';
// @ts-expect-error: package has no type declarations
import pluginChaiFriendly from 'eslint-plugin-chai-friendly';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  { linterOptions: { reportUnusedDisableDirectives: 'warn' } },
  // global ignores. also ignore temporarily bundled rollup config
  { ignores: ['lib', 'tmp', 'rollup.config-*.mjs'] },
  {
    files: ['.mocharc.cjs', 'examples/*', 'test/fixtures/*'],
    languageOptions: { globals: globals.node }
  },
  {
    // for *.ts files only
    files: ['**/*.ts'],
    rules: { '@typescript-eslint/explicit-module-boundary-types': 'warn' }
  },
  {
    rules: {
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-unused-expressions': [
        'warn',
        { allowShortCircuit: true, allowTernary: true }
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' }
      ],
      curly: 'warn',
      eqeqeq: ['warn', 'always', { null: 'ignore' }],
      'no-constant-condition': 'warn',
      'no-throw-literal': 'warn',
      'no-unused-expressions': 'off', // use typescript-eslint
      'no-unused-vars': 'off', // use typescript-eslint
      'no-var': 'warn',
      'prefer-const': 'warn',
      quotes: ['warn', 'single', 'avoid-escape'],
      semi: 'warn'
    }
  },
  {
    // for tests only, override no-unused-expressions
    files: ['**/*.spec.ts'],
    plugins: { 'chai-friendly': pluginChaiFriendly },
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'chai-friendly/no-unused-expressions': [
        'warn',
        { allowShortCircuit: true, allowTernary: true }
      ],
      'no-unused-expressions': 'off'
    }
  }
);