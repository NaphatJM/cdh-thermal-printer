// src/utils.js

/**
 * แปลงข้อมูลภาพ (ImageData) เป็นคำสั่ง ESC/POS GS v 0
 * @param {ImageData} imageData
 * @returns {number[]} Array ของ Byte คำสั่ง
 */
export function convertCanvasToEscPos(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const pixels = imageData.data;

    // 1 Byte = 8 pixels แนวนอน
    const xBytes = width / 8;

    let command = [];

    // Header: GS v 0 (Raster Bit Image)
    command.push(0x1d, 0x76, 0x30, 0x00);

    // บอกขนาดภาพ (Little Endian)
    command.push(xBytes % 256, Math.floor(xBytes / 256)); // xL, xH
    command.push(height % 256, Math.floor(height / 256)); // yL, yH

    // Loop ทุก Pixel แปลงเป็น Bit
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < xBytes; x++) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
                // คำนวณตำแหน่ง Pixel ใน Array (RGBA = 4 ช่องต่อ 1 pixel)
                const pxIndex = (y * width + x * 8 + bit) * 4;

                // เช็คความสว่าง (R+G+B)
                // ถ้าค่าต่ำกว่า 380 (ค่อนข้างมืด) ให้ถือเป็นสีดำ (Bit=1)
                const brightness =
                    pixels[pxIndex] + pixels[pxIndex + 1] + pixels[pxIndex + 2];
                if (brightness < 380) {
                    byte |= 1 << (7 - bit);
                }
            }
            command.push(byte);
        }
    }

    return command;
}
/**
 * แปลงข้อความเป็น ImageData (Client-side only)
 * ต้องใช้ใน Browser environment เท่านั้น
 *
 * ⚠️ REQUIRED: Sarabun font must be loaded in your HTML:
 * <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
 *
 * @param {string} text - Thai text to convert
 * @param {number} width - Canvas width in pixels (default: 384)
 * @param {number} fontSize - Font size in pixels (default: 22)
 * @returns {ImageData} Canvas ImageData object
 * @throws {Error} If not in browser environment
 *
 * @example
 * // Client-side (React/Next.js)
 * const imageData = textToImageData("สวัสดี", 384, 22);
 * await fetch('/api/print', {
 *     body: JSON.stringify({
 *         data: Array.from(imageData.data),
 *         width: imageData.width,
 *         height: imageData.height,
 *     })
 * });
 */
export function textToImageData(text, width = 384, fontSize = 22) {
    // ตรวจสอบว่าเป็น Browser environment
    if (typeof document === "undefined") {
        throw new Error(
            "textToImageData() requires browser environment with Canvas API",
        );
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // ตั้งค่า Font
    const fontFamily = "'Sarabun', sans-serif";
    const lineHeight = fontSize + 12;
    const lines = text.split("\n");

    // คำนวณความสูง
    const height = lines.length * lineHeight + 20;

    canvas.width = width;
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

    // ดึง ImageData
    return ctx.getImageData(0, 0, width, height);
}
