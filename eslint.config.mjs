import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.FlatConfig[]} */
const configs = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-constant-condition': 0,
      'no-unused-vars': 0,
      quotes: [1, 'single', 'avoid-escape'],
      '@typescript-eslint/explicit-module-boundary-types': 1,
      '@typescript-eslint/no-empty-function': 0,
      '@typescript-eslint/no-explicit-any': 0,
      '@typescript-eslint/no-inferrable-types': 0,
      '@typescript-eslint/no-non-null-assertion': 1,
      '@typescript-eslint/no-unused-vars': [1, { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-var-requires': 0
    }
  }
];

export default configs.map(config => {
  config = { ...config };
  config.files = ['**/*.{js,cjs,mjs,ts,cts,mts}'];
  config.ignores = ['lib/**/*', '**/tmp/**/*'];
  return config;
});
