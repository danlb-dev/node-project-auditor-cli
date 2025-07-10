import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import parserTs from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    languageOptions: {
      parser: parserTs,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      eqeqeq: ['error', 'always'],
      quotes: ['warn', 'single', { avoidEscape: true }],
      semi: ['warn', 'always'],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
      'prefer-const': 'warn',
      '@typescript-eslint/class-methods-use-this': 'warn',
      '@typescript-eslint/no-duplicate-enum-values': 'error',
    },
  },
);
