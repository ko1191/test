module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['**/*.tsx'],
      extends: ['plugin:react/jsx-runtime'],
    },
    {
      files: ['apps/backend/**/*.ts'],
      env: {
        node: true,
      },
    },
  ],
  ignorePatterns: ['dist', 'node_modules'],
};
