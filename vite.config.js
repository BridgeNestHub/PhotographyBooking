// vite.config.js
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // CORRECTED: Point to your 'public' folder from the root
  root: path.resolve(__dirname, './public'), 

  // Configure the development server
  server: {
    // Set the port for your dev server
    port: 8080,
    // This is the proxy configuration
    proxy: {
      // All requests starting with /submit-booking will be forwarded
      '/submit-booking': 'http://localhost:3000'
    }
  },

  // Configuration for building the production files
  build: {
    // Output directory for the build files
    outDir: path.resolve(__dirname, './dist') 
  }
});