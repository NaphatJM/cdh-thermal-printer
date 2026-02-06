// vite.config.js
import { defineConfig } from "vite";
import path from "path";
import fs from "fs";

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, "src/index.js"),
            name: "ThermalPrinter", // ชื่อตัวแปร Global เมื่อใช้ผ่าน CDN
            fileName: (format) => `thermal-printer.${format}.js`,
            formats: ["es", "umd"], // ES modules และ UMD
        },
        // ตั้งค่า rollup
        rollupOptions: {
            // ถ้ามี dependency อื่นๆ ที่ไม่ต้องการรวมใส่ไฟล์ ให้ระบุตรงนี้
            external: [],
            output: {
                globals: {},
            },
        },
        // เปิด source maps
        sourcemap: true,
    },
    // Plugin: Copy .d.ts ไปยัง dist
    plugins: [
        {
            name: "copy-types",
            apply: "build",
            writeBundle() {
                const srcPath = path.resolve(__dirname, "src/index.d.ts");
                const distPath = path.resolve(__dirname, "dist/index.d.ts");
                if (fs.existsSync(srcPath)) {
                    fs.copyFileSync(srcPath, distPath);
                    console.log("✓ Copied index.d.ts to dist/");
                }
            },
        },
    ],
});
