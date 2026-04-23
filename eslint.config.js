import globals from 'globals';
import js from '@eslint/js';
import pkg from './package.json' with { type: 'json', };
import { readFileSync, } from 'node:fs';
import { configs as tsConfigs, } from 'typescript-eslint';
import tsPlugin from '@typescript-eslint/eslint-plugin';


export default [
  { files: [ '**/*.{ts,js,cjs,mjs}', ], },
  { languageOptions: { globals: globals.node, }, },
  { settings: { node: { version: pkg.engines.node, }, }, },
  { ignores: [ ...readFileSync('.gitignore', 'utf-8',).split('\n',).filter((line,) => line && !line.startsWith('#',),), ], },
  js.configs.all,

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


  {
    rules: {
      // Disable Lint settings
      'no-warning-comments':                    'warn', // To allow for development productivity but be warned that long-term use is not desirable.
      'no-undefined':                            'off', // To use of TypeScript is prohibited from changing global objects.
      'sort-keys':                               'off', // To prioritize semantic order over alphabetical order. (e.g. prefer 'id, name, email' to 'email, id, name')
      '@typescript-eslint/member-ordering':      'off', // To prioritize semantic order over alphabetical order. (e.g. prefer 'id, name, email' to 'email, id, name')
      '@typescript-eslint/no-magic-numbers':     'off', // To handle numerical values directly like HTTP status code and appropriateness of use is assessed by review.
      '@typescript-eslint/no-use-before-define': 'off', // To keep readability by declaring lower importance(like private function) at low position in file.

      // Customize Lint settings
      '@typescript-eslint/consistent-type-definitions': [ 'error', 'type', ],                      // Use type alias instead of interface to prevent dangerous type overrides

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
      '@typescript-eslint/max-params':                      [ 'error', { max: 5, },],
      '@typescript-eslint/prefer-readonly-parameter-types': [ 'off', ],
      '@typescript-eslint/strict-boolean-expressions':      [ 'error', { allowNullableBoolean: true, allowNullableNumber: true, allowNullableString: true, allowNullableObject: true, },],
    },
  },

  {
    files: [ 'eslint.config.js', ],
    rules: {
      'id-length': 'off',
    },
  },

  {
    files: [ '**/*.{js,cjs,mjs}', ],
    ...tsConfigs.disableTypeChecked,
  },
];
