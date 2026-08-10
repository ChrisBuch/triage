// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default defineConfig([
  globalIgnores([
    "dist/*", 
    "node_modules/*", 
    "coverage/*"
  ]),
  { 
    files: ["**/*.ts", "**/*.js"], 
    languageOptions: { globals: globals.node } 
  },
  {
    files: ["**/*.ts", "**/*.js"],
    plugins: { js },
    extends: [
      "js/recommended",
      ...tseslint.configs.recommended
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  eslintPluginPrettierRecommended
]);