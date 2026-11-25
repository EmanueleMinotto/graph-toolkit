import js from '@eslint/js';
import functional from 'eslint-plugin-functional';
import importX from 'eslint-plugin-import-x';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';

const calisthenics = {
  'max-depth': ['error', 2],
  'max-params': ['error', 3],
  'max-lines-per-function': ['error', { max: 20, skipBlankLines: true, skipComments: true }],
  'max-lines': ['error', { max: 150, skipBlankLines: true, skipComments: true }],
  complexity: ['error', 6],
  'no-else-return': 'error',
  'no-lonely-if': 'error',
  'no-nested-ternary': 'error',
  'no-magic-numbers': ['error', { ignore: [-1, 0, 1, 2], ignoreArrayIndexes: true }],
  'no-var': 'error',
  'prefer-const': 'error',
  'no-restricted-syntax': [
    'error',
    { selector: 'SwitchStatement', message: 'Use a lookup table or early returns.' },
    { selector: 'MethodDefinition[kind=/^(get|set)$/]', message: 'No getters/setters.' },
  ],
};

// Hot-path kernels: mutation confined here, never exposed through the public API.
const internalKernels = {
  'functional/immutable-data': 'off',
  'functional/no-let': 'off',
  'functional/prefer-readonly-type': 'off',
  'unicorn/no-for-loop': 'off',
  '@typescript-eslint/prefer-for-of': 'off', // queue loops append while iterating
  'unicorn/no-loop-iterable-mutation': 'off',
  'unicorn/no-array-reduce': 'off',
  'unicorn/no-null': 'off',
  'unicorn/no-unreadable-array-destructuring': 'off',
  '@typescript-eslint/no-non-null-assertion': 'off',
  'max-depth': ['error', 3],
  'no-magic-numbers': 'off',
};

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/.turbo/**', 'docs/api/**'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  sonarjs.configs.recommended,
  unicorn.configs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.mjs', 'packages/*/*.config.ts', 'apps/*/*.config.ts'],
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 50,
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: { 'import-x/resolver-next': [createTypeScriptImportResolver()] },
    plugins: { functional },
    rules: {
      ...calisthenics,
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'functional/immutable-data': 'error',
      'functional/no-let': 'error',
      'functional/prefer-readonly-type': 'error',
      'import-x/no-cycle': 'error',
      'import-x/no-default-export': 'error',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
      'import-x/no-extraneous-dependencies': 'error',
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-null': 'off',
      'unicorn/single-line-block-comment-style': 'off',
      'unicorn/no-asterisk-prefix-in-documentation-comments': 'off',
      'unicorn/consistent-boolean-name': 'off',
      'unicorn/consistent-class-member-order': 'off',
      'unicorn/prefer-iterator-to-array': 'off',
      'sonarjs/redundant-type-aliases': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  { files: ['**/src/internal/**/*.ts', '**/src/mutable/**/*.ts'], rules: internalKernels },
  {
    // Builders and public mutable data structures (src/mutable) are mutable by design; they only expose immutable results.
    files: ['**/src/*-builder.ts', '**/src/mutable/**/*.ts'],
    rules: { 'functional/immutable-data': 'off', 'functional/prefer-readonly-type': 'off' },
  },
  {
    files: ['**/*.test.ts', '**/*.bench.ts'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      'max-lines-per-function': 'off',
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'functional/immutable-data': 'off',
      'functional/no-let': 'off',
      'functional/prefer-readonly-type': 'off',
      'unicorn/max-nested-calls': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'import-x/no-extraneous-dependencies': 'off',
    },
  },
  {
    // UI code: JSX components are long by nature; keep structure rules, relax size/style ones.
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'max-lines-per-function': 'off',
      'no-magic-numbers': 'off',
      'unicorn/filename-case': ['error', { cases: { kebabCase: true, pascalCase: true } }],
      'unicorn/name-replacements': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
    },
  },
  {
    // Benchmark fixtures: imperative generators, not library code.
    files: ['apps/benchmarks/**/*.ts'],
    rules: {
      'functional/no-let': 'off',
      'functional/immutable-data': 'off',
      'no-magic-numbers': 'off',
      'unicorn/consistent-function-scoping': 'off',
    },
  },
  {
    files: ['**/*.config.{ts,mjs}'],
    rules: { 'import-x/no-default-export': 'off', 'import-x/no-extraneous-dependencies': 'off' },
  },
  {
    files: ['**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    rules: { ...tseslint.configs.disableTypeChecked.rules, 'no-magic-numbers': 'off' },
  },
  prettier,
);
