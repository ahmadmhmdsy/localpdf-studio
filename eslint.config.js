import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'src-tauri/target/**', '.superpowers/**', 'audit-evidence/**', '.agents/**'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // App code: explicit `any` is forbidden. Tests are exempted below
      // because partial store mocks (`vi.spyOn(useStore, 'useStore').mockReturnValue({...} as any)`)
      // legitimately need an escape hatch.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-unused-expressions': 'warn',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-throw-literal': 'error',
    },
  },
  {
    // Test files: relaxed `any` to support partial mocks, jsdom polyfills,
    // and third-party test fixture shapes (e.g. pdfjs textContent.items).
    files: ['**/*.test.{ts,tsx}', 'src/tests/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
