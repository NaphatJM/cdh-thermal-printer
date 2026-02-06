// src/index.js
import { CMD } from "./constants";
import { convertCanvasToEscPos, textToImageData } from "./utils";

/**
 * Thermal Printer Library for ESC/POS printers
 *
 * IMPORTANT: When using printThaiText() or textToImageData(), you must load the Sarabun font in your HTML:
 * <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
 *
 * Without this link, the printer will use the default system font instead of Sarabun.
 */
export { textToImageData } from "./utils";
export class ThermalPrinter {
    constructor(driverApiUrl = "http://localhost:9123", width = 384) {
        this.driverApi = driverApiUrl;
        this.printerWidth = width; // 384 dots = 58mm, 576 dots = 80mm
        this.buffer = [];
    }

    // --- Basic Commands ---

    init() {
        this.buffer.push(...CMD.INIT);
        return this;
    }

    align(alignment = 1) {
        // 0=Left, 1=Center, 2=Right
        const cmd = [...CMD.ALIGN_LEFT];
        cmd[2] = alignment;
        this.buffer.push(...cmd);
        return this;
    }

    bold(enable = true) {
        this.buffer.push(...(enable ? CMD.BOLD_ON : CMD.BOLD_OFF));
        return this;
    }

    feed(lines = 1) {
        for (let i = 0; i < lines; i++) this.buffer.push(CMD.LF);
        return this;
    }

    cut(partial = false) {
        this.buffer.push(...(partial ? CMD.CUT_PARTIAL : CMD.CUT_FULL));
        return this;
    }

    line(text = "") {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text + "\n");
        this.buffer.push(...bytes);
        return this;
    }

    newline(count = 1) {
        for (let i = 0; i < count; i++) {
            this.buffer.push(CMD.LF);
        }
        return this;
    }

    divider(char = "-", width = 32) {
        this.line(char.repeat(width));
        return this;
    }

    beep(times = 1, duration = 100) {
        for (let i = 0; i < times; i++) {
            this.buffer.push(...CMD.BEEP(duration));
        }
        return this;
    }

    drawerKick() {
        this.buffer.push(...CMD.DRAWER_KICK);
        return this;
    }

    raw(bytes) {
        this.buffer.push(...bytes);
        return this;
    }

    // --- Image & Thai Text Logic ---

    image(imageData) {
        const bytes = convertCanvasToEscPos(imageData);
        this.buffer.push(...bytes);
        return this;
    }

    /**
     * พิมพ์ข้อความภาษาไทย (Render เป็นรูปภาพอัตโนมัติ)
     *
     * ⚠️ REQUIRED: Sarabun font must be loaded in your HTML file:
     * <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
     *
     * Without this link, the system will use the default font instead.
     *
     * @param {string} text - Thai text to print
     * @param {number} fontSize - Font size in pixels (default: 22)
     */
    printThaiText(text, fontSize = 22) {
        if (typeof document === "undefined") {
            console.error("Browser environment required for printThaiText");
            return this;
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // ตั้งค่า Font
        const fontFamily = "'Sarabun', sans-serif";
        const lineHeight = fontSize + 12;
        const lines = text.split("\n");

        // คำนวณความสูง
        const height = lines.length * lineHeight + 20;

        canvas.width = this.printerWidth;
        canvas.height = height;

        // วาดพื้นหลังขาว
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // วาดข้อความ
        ctx.fillStyle = "black";
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textBaseline = "top";

        let y = 10;
        for (let line of lines) {
            ctx.fillText(line, 10, y);
            y += lineHeight;
        }

        const imageData = ctx.getImageData(0, 0, this.printerWidth, height);
        return this.image(imageData);
    }

    // --- Execution ---

    clear() {
        this.buffer = [];
        return this;
    }

    getBuffer() {
        return new Uint8Array(this.buffer);
    }

    async print(printerName) {
        // ถ้าไม่ส่งชื่อมา ให้ลองดึงตัวแรก
        if (!printerName) {
            const printers = await ThermalPrinter.getPrinters(this.driverApi);
            if (printers.length > 0) printerName = printers[0];
            else throw new Error("No printer found.");
        }

        try {
            const bufferData = this.getBuffer();
            const encodedName = encodeURIComponent(printerName);

            const res = await fetch(
                `${this.driverApi}/print?printer=${encodedName}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/octet-stream" },
                    body: bufferData,
                },
            );

            if (!res.ok) throw new Error("Driver Error");

            this.clear();
            return { success: true };
        } catch (e) {
            console.error("Print Failed:", e);
            throw e;
        }
    }

    // --- Static Methods ---

    static async getPrinters(apiUrl = "http://localhost:9123") {
        try {
            const res = await fetch(`${apiUrl}/printers`);
            return await res.json();
        } catch (e) {
            console.error("Connection Error:", e);
            return [];
        }
    }
}
