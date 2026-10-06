import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import nextPlugin from '@next/eslint-plugin-next';
import tseslint from 'typescript-eslint';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({
  baseDirectory: rootDir,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const onlyFiles = (configs, files) => configs.map((config) => ({ ...config, files }));
const webFiles = ['apps/web/**/*.{js,jsx,ts,tsx}'];
const serverFiles = ['apps/api/**/*.ts', 'packages/**/*.ts'];

export default [
  {
    ignores: [
      '**/.next/**',
      '**/.turbo/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      'apps/web/next-env.d.ts',
    ],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  ...onlyFiles(compat.extends('next/core-web-vitals', 'next/typescript'), webFiles),
  ...onlyFiles(tseslint.configs.recommended, serverFiles),
  {
    files: [...webFiles, ...serverFiles],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: webFiles,
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
    },
    settings: {
      next: { rootDir: 'apps/web' },
    },
  },
];
