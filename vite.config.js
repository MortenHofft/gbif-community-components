import { defineConfig } from 'vite';

// Encapsulated (Shadow DOM) build. A light-DOM build is planned as a second
// entry point over the same shared code.
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      formats: ['es'],
      fileName: () => 'gbif-components.js'
    },
    target: 'es2022',
    // Leaflet's stylesheet is inlined into the component that needs it.
    assetsInlineLimit: 1_000_000
  },
  server: { host: '127.0.0.1' }
});
