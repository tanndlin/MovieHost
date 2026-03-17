import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig({
    base: '/',
    plugins: [react(), svgr()],

    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:7032', // Rust backend
                changeOrigin: true
            },
            '/ws': {
                target: 'ws://localhost:7032',
                ws: true
            }
        }
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
        css: true,
        reporters: ['verbose'],
        coverage: {
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*'],
            exclude: []
        }
    }
});
