import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: ['dist/**', 'dist-server/**', 'node_modules/**', 'coverage/**']
  },
  {
    files: ['src/**/*.{ts,tsx}', 'server.ts', 'vite.config.ts', 'scripts/**/*.mjs'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks
    },
    rules: {
      'no-debugger': 'error',
      'no-var': 'error',
      'no-unreachable': 'error',
      'prefer-const': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
];
