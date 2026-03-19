import {
  DEFAULT_IGNORES,
  setEslintLanguageOptionsProject,
  setEslintLanguageOptionsRootAsNode,
  setEslintPluginJest,
  setEslintPluginJestDom,
  setEslintPluginPrettier,
  setEslintPluginTypescriptEslint,
  setEslintPluginUnicorn,
} from './eslint.config.utils.js';

const allowList = ['dev', 'Dev', 'dir', 'msg', 'Msg', 'args', 'Args', 'utils'];

export default [
  { ignores: DEFAULT_IGNORES },
  setEslintLanguageOptionsProject(),
  setEslintLanguageOptionsRootAsNode(),
  setEslintPluginUnicorn({
    allowList,
    rules: {
      'unicorn/no-array-sort': 'off',
    },
  }),
  setEslintPluginJest(),
  setEslintPluginJestDom(),
  setEslintPluginPrettier(),
  ...setEslintPluginTypescriptEslint({
    rules: {
      'no-empty': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }),
];
