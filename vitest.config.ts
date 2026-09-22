import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    define: {
        __APP_VERSION__: JSON.stringify('0.0.0-test'),
        __APP_COMMIT__: JSON.stringify('testsha'),
    },
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    test: {
        environment: 'happy-dom',
        include: ['src/**/__tests__/**/*.spec.ts'],
    },
});
