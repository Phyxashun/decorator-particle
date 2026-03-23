// eslint.config.ts
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  // Global Ignores
  {
    ignores: ['dist', 'node_modules', 'bin', 'out'],
  },

  // Base Configs
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Prettier Integration
  prettierRecommended,

  // Custom Rules
  {
    rules: {
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      // Add any specific overrides here
    },
  }
);
