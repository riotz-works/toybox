/* eslint-disable import-x/no-default-export -- 'cuz defined by ESLint */
import { readFileSync, } from 'node:fs';
import js from '@eslint/js';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import stylistic from '@stylistic/eslint-plugin';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import { flatConfigs as importFlatConfigs, } from 'eslint-plugin-import-x';
import n from 'eslint-plugin-n';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';
import { configs as tsConfigs, } from 'typescript-eslint';
import pkg from './package.json' with { type: 'json', };


export default [
  { files: [ '**/*.{ts,js,cjs,mjs}', ], },
  { languageOptions: { globals: globals.node, }, },
  { settings: { node: { version: pkg.engines.node, }, }, },
  { ignores: [ ...readFileSync('.gitignore', 'utf-8',).split('\n',).filter((line,) => line && !line.startsWith('#',),), ], },
  js.configs.all,
  stylistic.configs.all,
  n.configs['flat/all'],
  comments.recommended,
  security.configs.recommended,
  sonarjs.configs.recommended,

  ...tsConfigs.all,
  {
    languageOptions: {
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  importFlatConfigs.recommended,
  importFlatConfigs.typescript,
  {
    settings: {
      'import-x/resolver': {
        node: true,
        typescript: true,
      },
    },
  },


  {
    rules: {
      // Disable Lint settings
      'no-warning-comments':                    'warn', // To allow for development productivity but be warned that long-term use is not desirable.
      'no-undefined':                            'off', // To use of TypeScript is prohibited from changing global objects.
      'sort-imports':                            'off', // To use import-x/order.
      'sort-keys':                               'off', // To prioritize semantic order over alphabetical order. (e.g. prefer 'id, name, email' to 'email, id, name')
      'sonarjs/fixme-tag':                       'off', // To use no-warning-comments.
      'sonarjs/todo-tag':                        'off', // To use no-warning-comments.
      '@typescript-eslint/member-ordering':      'off', // To prioritize semantic order over alphabetical order. (e.g. prefer 'id, name, email' to 'email, id, name')
      '@typescript-eslint/no-magic-numbers':     'off', // To handle numerical values directly like HTTP status code and appropriateness of use is assessed by review.
      '@typescript-eslint/no-use-before-define': 'off', // To keep readability by declaring lower importance(like private function) at low position in file.

      // Customize Lint settings
      '@eslint-community/eslint-comments/disable-enable-pair': [ 'error', { allowWholeFile: true, },],    // To improve readability by disabling rule in whole file for configuration and test cases, etc.
      '@stylistic/newline-per-chained-call':                   [ 'error', { ignoreChainWithDepth: 5, },], // To take advantage of chained call flexibility.
      '@typescript-eslint/consistent-type-definitions':        [ 'error', 'type', ],                      // Use type alias instead of interface to prevent dangerous type overrides

      // Enable Lint settings
      '@eslint-community/eslint-comments/no-unused-disable':   'error',
      '@eslint-community/eslint-comments/require-description': 'error',
      'import-x/first':                                        'error',
      'import-x/group-exports':                                'error',
      'import-x/newline-after-import':                         'error',
      'import-x/no-default-export':                            'error',
      'import-x/no-duplicates':                                'error',
      'import-x/no-named-as-default':                          'error',
      'import-x/no-named-as-default-member':                   'error',
      'import-x/no-named-default':                             'error',
      'import-x/no-namespace':                                 'error',
      'import-x/no-unassigned-import':                         'error',
      'import-x/order':                                        [ 'error', { 'alphabetize': { order: 'asc', }, 'newlines-between': 'never', },],

      // Custom rule: Force "right side is larger" inequality
      'yoda': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'BinaryExpression[operator=">"]',
          message: 'Write inequality so that the right side is larger. Use "right > left" instead of "left > right".',
        },
        {
          selector: 'BinaryExpression[operator=">="]',
          message: 'Write inequality so that the right side is larger. Use "right >= left" instead of "left >= right".',
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'classProperty',
          modifiers: [ 'static', 'readonly', ],
          format: [ 'UPPER_CASE', ],
        },
        ...tsPlugin.rules['naming-convention'].defaultOptions,
      ],


      // By the coding style of project
      'max-statements':                                     [ 'error', 15, ],
      'no-inline-comments':                                 [ 'off', ],
      'no-negated-condition':                               [ 'off', ],
      'no-nested-ternary':                                  [ 'off', ],
      'no-ternary':                                         [ 'off', ],
      'one-var':                                            [ 'error', 'never', ],
      'sonarjs/no-nested-conditional':                      [ 'off', ],
      'sonarjs/no-nested-template-literals':                [ 'off', ],
      '@stylistic/array-bracket-newline':                   [ 'error', 'consistent', ],
      '@stylistic/array-bracket-spacing':                   [ 'error', 'always', { arraysInArrays: false, objectsInArrays: false, },],
      '@stylistic/array-element-newline':                   [ 'error', 'consistent', ],
      '@stylistic/brace-style':                             [ 'error', '1tbs', { allowSingleLine: true, },],
      '@stylistic/comma-dangle':                            [ 'error', 'always', ],
      '@stylistic/function-call-argument-newline':          [ 'error', 'consistent', ],
      '@stylistic/indent':                                  [ 'error', 2, { SwitchCase: 1, },],
      '@stylistic/key-spacing':                             [ 'error', { mode: 'minimum', },],
      '@stylistic/lines-between-class-members':             [ 'error', 'always', { exceptAfterSingleLine: true, },],
      '@stylistic/multiline-comment-style':                 [ 'error', 'separate-lines', ],
      '@stylistic/multiline-ternary':                       [ 'off', ],
      '@stylistic/no-confusing-arrow':                      [ 'off', ],
      '@stylistic/no-multi-spaces':                         [ 'error', { exceptions: { Property: true, VariableDeclarator: true, }, ignoreEOLComments: true, },],
      '@stylistic/object-curly-spacing':                    [ 'error', 'always', { arraysInObjects: false, objectsInObjects: false, },],
      '@stylistic/object-property-newline':                 [ 'error', { allowAllPropertiesOnSameLine: true, },],
      '@stylistic/padded-blocks':                           [ 'error', { switches: 'never', }, { allowSingleLineBlocks: true, },],
      '@stylistic/quote-props':                             [ 'error', 'consistent-as-needed', ],
      '@stylistic/quotes':                                  [ 'error', 'single', { avoidEscape: true, },],
      '@stylistic/space-before-function-paren':             [ 'error', { anonymous: 'always', named: 'never', asyncArrow: 'always', },],
      '@typescript-eslint/max-params':                      [ 'error', { max: 5, },],
      '@typescript-eslint/prefer-readonly-parameter-types': [ 'off', ],
      '@typescript-eslint/strict-boolean-expressions':      [ 'error', { allowNullableBoolean: true, allowNullableNumber: true, allowNullableString: true, allowNullableObject: true, },],
    },
  },

  {
    files: [ 'eslint.config.js', ],
    rules: {
      'n/no-sync': 'off',
      'id-length': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
    },
  },

  {
    files: [ '**/*.{js,cjs,mjs}', ],
    ...tsConfigs.disableTypeChecked,
  },

  {
    files: [ './infra/**/*.ts', ],
    rules: {
      'max-classes-per-file':                 'off',
      'max-lines-per-function':               'off',
      'max-statements':                       'off',
      'no-new':                               'off',
      'sonarjs/constructor-for-side-effects': 'off',
    },
  },
];
