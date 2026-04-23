/* eslint-disable @typescript-eslint/naming-convention, import-x/no-default-export -- 'cuz defined by Knip */
import type { KnipConfig, } from 'knip';

const config: KnipConfig = {
  $schema: 'https://unpkg.com/knip@5/schema.json',
  treatConfigHintsAsErrors: true,
  workspaces: {
    '.': {
      entry: [ '*.{js,ts}', ],
    },
  },
  exclude: [ 'unresolved', ],
  ignoreDependencies: [
    'eslint-formatter-table',
  ],
};


export default config;
