import { defineConfig } from 'vite';
import { resolve } from 'path';
import handlebars from 'vite-plugin-handlebars';

export default defineConfig({
    base: '/len/',
    plugins: [
        handlebars({
            partialDirectory: resolve(__dirname, 'partials'),
        }),
    ],
    test: {
        environment: 'happy-dom',
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                about: resolve(__dirname, 'about.html'),
                blog: resolve(__dirname, 'blog.html'),
                cart: resolve(__dirname, 'cart.html'),
                catalog: resolve(__dirname, 'catalog.html'),
                category: resolve(__dirname, 'category.html'),
                contacts: resolve(__dirname, 'contacts.html'),
                delivery: resolve(__dirname, 'delivery.html'),
                new: resolve(__dirname, 'new.html'),
                product: resolve(__dirname, 'product.html'),
                services: resolve(__dirname, 'services.html'),
                thanks: resolve(__dirname, 'thanks.html'),
                404: resolve(__dirname, '404.html'),
            },
        },
    },
});
