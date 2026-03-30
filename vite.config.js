import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import handlebars from 'vite-plugin-handlebars';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const wooOrigin = (env.WOO_ORIGIN || '').replace(/\/$/, '');
    const wooKey = env.WOO_CONSUMER_KEY || '';
    const wooSecret = env.WOO_CONSUMER_SECRET || '';

    /** Прокси /api/wc → Woo REST API; ключи только на стороне dev-сервера */
    const proxy =
        wooOrigin && wooKey && wooSecret
            ? {
                  '/api/wc': {
                      target: wooOrigin,
                      changeOrigin: true,
                      secure: true,
                      rewrite: (path) => {
                          const withoutPrefix = path.replace(/^\/api\/wc/, '/wp-json/wc/v3');
                          const sep = withoutPrefix.includes('?') ? '&' : '?';
                          return `${withoutPrefix}${sep}consumer_key=${encodeURIComponent(wooKey)}&consumer_secret=${encodeURIComponent(wooSecret)}`;
                      },
                  },
              }
            : undefined;

    return {
        base: '/',
        plugins: [
            handlebars({
                partialDirectory: resolve(__dirname, 'partials'),
            }),
        ],
        test: {
            environment: 'happy-dom',
        },
        server: proxy ? { proxy } : {},
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
    };
});
