import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        category: resolve(__dirname, 'category.html'),
        product: resolve(__dirname, 'product.html'),
        cart: resolve(__dirname, 'cart.html'),
        login: resolve(__dirname, 'login.html'),
        signup: resolve(__dirname, 'signup.html'),
        account: resolve(__dirname, 'account.html'),
        admin: resolve(__dirname, 'admin/index.html'),
      },
    },
  },
});
