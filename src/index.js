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
    constructor(width = 384) {
        this.driverApi = null; // เริ่มต้นยังไม่มี URL
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

    // ---  Auto Discovery & Print Logic  ---

    /**
     * วิ่งหา Driver ใน Port 9123-9130
     * (Lazy Mode: เรียกใช้เมื่อจำเป็น)
     */
    async findDriver() {
        // 1. ถ้ามี URL เดิมอยู่ ลองเช็คว่ายังอยู่ไหม (Ping)
        if (this.driverApi) {
            try {
                const res = await fetch(`${this.driverApi}/health`);
                if (res.ok) return true; // ยังอยู่ดี
            } catch (e) {
                console.warn("Driver connection lost, rescanning...");
                this.driverApi = null;
            }
        }

        // 2. ถ้าไม่มี หรือหลุด ให้วนหาใหม่
        for (let port = 9123; port <= 9130; port++) {
            const url = `http://localhost:${port}`;
            try {
                // ตั้ง Timeout สั้นๆ (100ms) เพื่อความเร็ว
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 100);

                const res = await fetch(`${url}/health`, {
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    // เช็ค Signature ว่าใช่ Driver ของเราไหม
                    if (data.service === "CDH-Driver") {
                        this.driverApi = url;
                        return true;
                    }
                }
            } catch (e) {
                // Port ไม่ว่าง หรือไม่ใช่ของเรา -> ข้าม
                continue;
            }
        }
        return false;
    }

    async print(printerName) {
        // 1. หา Driver ก่อน (Lazy Discovery)
        const found = await this.findDriver();
        if (!found) {
            throw new Error(
                "Cannot connect to Printer Driver. Please run the application.",
            );
        }

        // 2. ถ้าไม่ระบุชื่อ Printer ให้ดึงตัวแรก
        if (!printerName) {
            const printers = await ThermalPrinter.getPrinters(this.driverApi);
            if (printers.length > 0) printerName = printers[0].name;
            else throw new Error("No printer found in Windows settings.");
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

            if (!res.ok) throw new Error("Driver returned error");

            this.clear();
            return { success: true };
        } catch (e) {
            console.error("Print Failed:", e);
            throw e;
        }
    }

    // Static Method: ต้องสร้าง instance ชั่วคราวไปหา driver
    static async getPrinters(overrideUrl = null) {
        let apiUrl = overrideUrl;

        if (!apiUrl) {
            const temp = new ThermalPrinter();
            const found = await temp.findDriver();
            if (found) apiUrl = temp.driverApi;
            else return [];
        }

        try {
            const res = await fetch(`${apiUrl}/printers`);
            return await res.json();
        } catch (e) {
            console.error("Get Printers Failed:", e);
            return [];
        }
    }

    /**
     * ค้นหาปริ้นเตอร์ด้วย VID และ PID
     * @param {string} vid - Vendor ID (เช่น "VID_0FE6")
     * @param {string} pid - Product ID (เช่น "PID_811E")
     * @param {string} overrideUrl - URL ของ Driver (optional)
     * @returns {Promise<Array>} - Array ของปริ้นเตอร์ที่ตรงกับ VID/PID
     */
    static async getPrinters_filterByVidPid(vid, pid, overrideUrl = null) {
        let apiUrl = overrideUrl;

        if (!apiUrl) {
            const temp = new ThermalPrinter();
            const found = await temp.findDriver();
            if (found) apiUrl = temp.driverApi;
            else return [];
        }

        try {
            const res = await fetch(`${apiUrl}/printers`);
            const allPrinters = await res.json();
            // Filter โดย VID และ PID
            return allPrinters.filter(p => p.vid === vid && p.pid === pid);
        } catch (e) {
            console.error("Get Printers Failed:", e);
            return [];
        }
    }

    /**
     * พิมพ์ไปยังปริ้นเตอร์ที่ระบุด้วย VID และ PID
     * @param {string} vid - Vendor ID (เช่น "VID_0FE6")
     * @param {string} pid - Product ID (เช่น "PID_811E")
     * @returns {Promise<Object>} - ผลลัพธ์ของการพิมพ์
     */
    async print_fixId(vid, pid) {
        // 1. หา Driver ก่อน (Lazy Discovery)
        const found = await this.findDriver();
        if (!found) {
            throw new Error(
                "Cannot connect to Printer Driver. Please run the application.",
            );
        }

        // 2. ค้นหาปริ้นเตอร์ด้วย VID/PID
        const printers = await ThermalPrinter.getPrinters_filterByVidPid(
            vid,
            pid,
            this.driverApi,
        );
        if (printers.length === 0) {
            throw new Error(`No printer found with VID: ${vid}, PID: ${pid}`);
        }

        // 3. พิมพ์ไปยังปริ้นเตอร์ตัวแรก
        const printerName = printers[0].name;
        return this.print(printerName);
    }
}
