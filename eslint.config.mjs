import js from '@eslint/js';
import functional from 'eslint-plugin-functional';
import importX from 'eslint-plugin-import-x';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import vitest from '@vitest/eslint-plugin';
import stylistic from '@stylistic/eslint-plugin';
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

// Readability rules: flag ambiguous syntax, dead code and needless nesting.
const readability = {
  '@typescript-eslint/switch-exhaustiveness-check': 'error',
  '@typescript-eslint/prefer-readonly': 'error',
  '@typescript-eslint/member-ordering': 'error',
  '@typescript-eslint/consistent-type-exports': 'error',
  '@typescript-eslint/default-param-last': 'error',
  '@typescript-eslint/method-signature-style': 'error',
  '@typescript-eslint/no-useless-empty-export': 'error',
  '@typescript-eslint/no-shadow': 'error',
  '@typescript-eslint/strict-boolean-expressions': 'error',
  '@typescript-eslint/no-use-before-define': ['error', { functions: false, variables: false }],
  'sonarjs/no-collapsible-if': 'error',
  'sonarjs/prefer-immediate-return': 'error',
  'sonarjs/prefer-object-literal': 'error',
  'sonarjs/no-commented-code': 'error',
  'sonarjs/nested-control-flow': 'error',
  'sonarjs/destructuring-assignment-syntax': 'error',
  'sonarjs/max-union-size': 'error',
  'sonarjs/no-unused-function-argument': 'error',
  'sonarjs/no-duplicate-string': 'error',
  'sonarjs/expression-complexity': 'error',
  'unicorn/consistent-destructuring': 'error',
  'unicorn/no-unused-properties': 'error',
  'unicorn/better-regex': 'error',
  'unicorn/template-indent': 'error',
  'import-x/first': 'error',
  'import-x/order': 'error',
  'import-x/no-useless-path-segments': 'error',
  'import-x/no-mutable-exports': 'error',
  'import-x/no-namespace': 'error',
  '@stylistic/padding-line-between-statements': [
    'error',
    { blankLine: 'always', prev: '*', next: 'return' },
    { blankLine: 'always', prev: ['const', 'let'], next: '*' },
    { blankLine: 'any', prev: ['const', 'let'], next: ['const', 'let'] },
    { blankLine: 'always', prev: '*', next: ['if', 'for', 'while', 'try', 'switch'] },
    { blankLine: 'always', prev: ['if', 'for', 'while', 'try', 'switch'], next: '*' },
    { blankLine: 'always', prev: 'multiline-expression', next: '*' },
    { blankLine: 'always', prev: '*', next: 'multiline-expression' },
  ],
  'no-negated-condition': 'error',
  'no-continue': 'error',
  'no-multi-assign': 'error',
  'no-param-reassign': 'error',
  'no-implicit-coercion': 'error',
  'logical-assignment-operators': 'error',
  'object-shorthand': 'error',
  'arrow-body-style': 'error',
  'default-case': 'error',
  'no-underscore-dangle': 'error',
  camelcase: ['error', { properties: 'never' }],
  eqeqeq: 'error',
  'no-plusplus': 'error',
  'prefer-template': 'error',
  'prefer-destructuring': 'error',
  'require-unicode-regexp': 'error',
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
  'no-plusplus': 'off',
  'no-continue': 'off',
  // Braces on every `if` add lines; kernels get more room than the public API.
  'max-lines-per-function': ['error', { max: 30, skipBlankLines: true, skipComments: true }],
};

export default tseslint.config(
  { ignores: ['**/{dist,public,coverage,.turbo,.stryker-tmp,reports}/**', 'docs/{api,theme}/**'] },
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
    plugins: { functional, '@stylistic': stylistic },
    rules: {
      ...calisthenics,
      ...readability,
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
    files: ['**/*.test.ts', '**/*.bench.ts', '**/*.spec.ts', 'packages/test-utils/**/*.ts'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'no-plusplus': 'off',
      'no-continue': 'off',
      'require-unicode-regexp': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'import-x/no-namespace': 'off',
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
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      'no-magic-numbers': 'off',
      'unicorn/filename-case': ['error', { cases: { kebabCase: true, pascalCase: true } }],
      'unicorn/name-replacements': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
    },
  },
  {
    // React hooks hold mutable refs by design.
    files: ['apps/web/src/use-*.ts'],
    rules: {
      'functional/immutable-data': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'unicorn/no-useless-undefined': 'off',
    },
  },
  {
    // Benchmark fixtures: imperative generators, not library code.
    files: ['apps/benchmarks/**/*.ts'],
    rules: {
      'functional/no-let': 'off',
      'functional/immutable-data': 'off',
      'max-lines-per-function': 'off',
      'no-plusplus': 'off',
      'no-magic-numbers': 'off',
      'unicorn/consistent-function-scoping': 'off',
    },
  },
  {
    files: ['**/*.config.{ts,mjs}', '**/*.config.base.mjs'],
    rules: {
      'max-lines': 'off',
      camelcase: 'off',
      'import-x/no-default-export': 'off',
      'import-x/no-extraneous-dependencies': 'off',
    },
  },
  {
    files: ['**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    rules: { ...tseslint.configs.disableTypeChecked.rules, 'no-magic-numbers': 'off' },
  },
  prettier,
  { rules: { curly: 'error' } }, // after prettier, which would turn it off
);
