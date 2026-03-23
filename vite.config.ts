import { defineConfig } from 'vite';
// ... other imports like react() or vue() plugin

export default defineConfig({
  optimizeDeps: {
    rolldownOptions: {
      tsconfig: './tsconfig.json',
    },
  },
  plugins: [
    // ... other plugins
  ],
});
