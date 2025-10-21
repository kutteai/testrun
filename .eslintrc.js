module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    webextensions: true, // For Chrome extension APIs
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: ['dist/', 'netlify/functions/'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'import',
  ],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
  rules: {
    // Adjust Airbnb rules or add custom rules here
    // For example, to allow console.log in development
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'import/prefer-default-export': 'off',
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        ts: 'never',
      },
    ],
    'max-len': ['error', { code: 120, ignoreUrls: true, ignoreTemplateLiterals: true }], // Adjust line length
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': ['error'],
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    'radix': ['error', 'always'],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['backend/src/**/*.js', 'config.js'],
      env: {
        node: true,
        es2021: true,
      },
      parserOptions: {
        sourceType: 'module',
      },
      rules: {
        'import/no-import-module-exports': 'off',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    {
      files: ['netlify/functions/**/*.js'],
      env: {
        node: true,
        es2021: true,
      },
      parserOptions: {
        sourceType: 'module',
      },
      rules: {
        'import/no-import-module-exports': 'off',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'consistent-return': 'off',
      },
    },
  ],
};
