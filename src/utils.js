// src/utils.js

/**
 * แปลงข้อมูลภาพ (ImageData) เป็นคำสั่ง ESC/POS GS v 0
 * รองรับภาพ QR Code, Logo, Thai Text เป็นต้น
 *
 * @param {ImageData|Object} imageData - ImageData object หรือ ImageDataLike {data, width, height}
 * @param {number} brightnessThreshold - ค่าเกณฑ์สำหรับแยกสีดำ/ขาว (0-765, default: 382)
 * @returns {number[]} Array ของ Byte คำสั่ง ESC/POS
 *
 * @example
 * // QR Code (300x300px)
 * const qrCanvas = document.createElement('canvas');
 * await QRCode.toCanvas(qrCanvas, 'https://example.com', { width: 300 });
 * const imageData = qrCanvas.getContext('2d').getImageData(0, 0, 300, 300);
 * const bytes = convertCanvasToEscPos(imageData);
 */
export function convertCanvasToEscPos(imageData, brightnessThreshold = 382) {
    const width = imageData.width;
    const height = imageData.height;
    const pixels = imageData.data;

    // 1 Byte = 8 pixels แนวนอน (pad ให้ได้ width ที่หารด้วย 8 ลงตัว)
    const paddedWidth = Math.ceil(width / 8) * 8;
    const xBytes = paddedWidth / 8;

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
                const pixelX = x * 8 + bit;

                // ถ้าเกินขอบภาพ ให้เป็นสีขาว (Bit=0)
                if (pixelX >= width) {
                    continue;
                }

                // คำนวณตำแหน่ง Pixel ใน Array (RGBA = 4 ช่องต่อ 1 pixel)
                const pxIndex = (y * width + pixelX) * 4;

                // เช็คความสว่าง: R+G+B (ระหว่าง 0-765)
                // ถ้าค่าต่ำกว่า threshold ให้ถือเป็นสีดำ (Bit=1)
                const brightness =
                    pixels[pxIndex] + // Red
                    pixels[pxIndex + 1] + // Green
                    pixels[pxIndex + 2]; // Blue
                // (ไม่ใช้ Alpha channel)

                if (brightness < brightnessThreshold) {
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
