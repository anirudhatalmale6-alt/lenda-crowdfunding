import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
    // Load env variables
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [react()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        define: {
            // Define VITE_API_URL for test environment
            'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:3000'),
        },
        server: {
            port: 3000,
            proxy: {
                '/api': {
                    target: 'http://localhost:8000',
                    changeOrigin: true,
                },
            },
        },
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: ['./src/test/setup.js'],
            env: {
                VITE_API_URL: 'http://localhost:3000',
            },
            include: [
                'src/**/*.{test,spec}.{js,mjs,cjs,jsx,ts,tsx}',
            ],
            exclude: [
                'node_modules/',
                'dist/',
            ],
            coverage: {
                provider: 'v8',
                reporter: ['text', 'json', 'html'],
                include: ['src/**/*.{js,jsx}'],
                exclude: ['src/test/**/*'],
            },
        },
    };
});
