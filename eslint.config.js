import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist', '**/.vitest', 'Docs', 'Docs2', '.claude'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // API, seed, scripts e configs: ambiente Node.
  {
    files: [
      'apps/api/**/*.ts',
      'packages/**/*.ts',
      'scripts/**/*.mjs',
      '*.js',
      'apps/web/vite.config.ts',
    ],
    languageOptions: { globals: globals.node },
  },

  // Front-end: navegador + regras de hooks do React.
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },

  // Desliga regras de estilo que conflitam com o Prettier (o Prettier formata).
  prettier,
);
