/**
 * Thermal Printer Library for ESC/POS printers
 * Supports Thai text rendering and image printing
 */

/**
 * Print response type
 */
export interface PrintResponse {
    success: boolean;
    message?: string;
}

/**
 * Convert Thai text to ImageData (Client-side only)
 *
 * ⚠️ REQUIRED: Sarabun font must be loaded in your HTML:
 * ```html
 * <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
 * ```
 *
 * @param text - Thai text to convert
 * @param width - Canvas width in pixels (default: 384 = 58mm)
 * @param fontSize - Font size in pixels (default: 22)
 * @returns ImageData object ready for printing
 * @throws Error if not in browser environment
 *
 * @example
 * ```javascript
 * // Client-side
 * const imageData = textToImageData("สวัสดี", 384, 22);
 * await fetch('/api/print', {
 *     body: JSON.stringify({
 *         data: Array.from(imageData.data),
 *         width: imageData.width,
 *         height: imageData.height,
 *     })
 * });
 *
 * // Server-side (API route)
 * const printer = new ThermalPrinter();
 * printer
 *     .init()
 *     .image({
 *         data: new Uint8ClampedArray(req.body.data),
 *         width: req.body.width,
 *         height: req.body.height,
 *     })
 *     .print("Printer Name");
 * ```
 */
export function textToImageData(
    text: string,
    width?: number,
    fontSize?: number,
): ImageData;

/**
 * ThermalPrinter Service
 * Fluent API for controlling thermal printer with ESC/POS commands
 *
 * @example
 * ```javascript
 * const printer = new ThermalPrinter("http://localhost:9123", 384);
 * printer
 *     .init()
 *     .align(1)
 *     .printThaiText("สวัสดี")
 *     .feed(2)
 *     .cut()
 *     .print("Printer Name");
 * ```
 */
export class ThermalPrinter {
    /**
     * Initialize ThermalPrinter instance
     * @param driverApiUrl - URL of the thermal printer driver API (default: http://localhost:9123)
     * @param width - Printer width in dots (384 = 58mm, 576 = 80mm, default: 384)
     */
    constructor(driverApiUrl?: string, width?: number);

    /**
     * Driver API URL
     */
    readonly driverApi: string;

    /**
     * Printer width in dots
     */
    readonly printerWidth: number;

    /**
     * Internal command buffer
     */
    readonly buffer: number[];

    // --- Basic Commands ---

    /**
     * Initialize printer (ESC @)
     * @returns this for method chaining
     */
    init(): ThermalPrinter;

    /**
     * Set text alignment
     * @param alignment - 0=Left, 1=Center, 2=Right (default: 1)
     * @returns this for method chaining
     */
    align(alignment?: 0 | 1 | 2): ThermalPrinter;

    /**
     * Enable or disable bold text
     * @param enable - true to enable, false to disable (default: true)
     * @returns this for method chaining
     */
    bold(enable?: boolean): ThermalPrinter;

    /**
     * Feed paper by specified lines
     * @param lines - Number of lines to feed (default: 1)
     * @returns this for method chaining
     */
    feed(lines?: number): ThermalPrinter;

    /**
     * Cut paper
     * @param partial - true for partial cut, false for full cut (default: false)
     * @returns this for method chaining
     */
    cut(partial?: boolean): ThermalPrinter;

    /**
     * Add line of text with newline
     * @param text - Text to print (default: "")
     * @returns this for method chaining
     */
    line(text?: string): ThermalPrinter;

    /**
     * Add blank lines
     * @param count - Number of blank lines to add (default: 1)
     * @returns this for method chaining
     */
    newline(count?: number): ThermalPrinter;

    /**
     * Add divider line
     * @param char - Character to repeat (default: "-")
     * @param width - Width of divider in characters (default: 32)
     * @returns this for method chaining
     */
    divider(char?: string, width?: number): ThermalPrinter;

    /**
     * Beep speaker
     * @param times - Number of beeps (default: 1)
     * @param duration - Duration of beep in milliseconds (default: 100)
     * @returns this for method chaining
     */
    beep(times?: number, duration?: number): ThermalPrinter;

    /**
     * Open cash drawer
     * @returns this for method chaining
     */
    drawerKick(): ThermalPrinter;

    /**
     * Send raw byte array
     * @param bytes - Byte array to send
     * @returns this for method chaining
     */
    raw(bytes: number[]): ThermalPrinter;

    // --- Image & Thai Text Logic ---

    /**
     * Print image from canvas ImageData
     * @param imageData - Canvas ImageData object
     * @returns this for method chaining
     */
    image(imageData: ImageData): ThermalPrinter;

    /**
     * Print Thai text (automatically renders as image)
     *
     * ⚠️ REQUIRED: Sarabun font must be loaded in your HTML file:
     * ```html
     * <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
     * ```
     *
     * @param text - Thai text to print
     * @param fontSize - Font size in pixels (default: 22)
     * @returns this for method chaining
     */
    printThaiText(text: string, fontSize?: number): ThermalPrinter;

    // --- Execution ---

    /**
     * Clear all buffered commands
     * @returns this for method chaining
     */
    clear(): ThermalPrinter;

    /**
     * Get compiled binary data
     * @returns Uint8Array of buffered commands
     */
    getBuffer(): Uint8Array;

    /**
     * Print to specific printer
     * @param printerName - Name of printer to print to (optional, will use first available if not provided)
     * @returns Promise resolving to print response
     * @throws Error if printer not found or print failed
     */
    print(printerName?: string): Promise<PrintResponse>;

    // --- Static Methods ---

    /**
     * Get list of available printers
     * @param apiUrl - Driver API URL (default: http://localhost:9123)
     * @returns Promise resolving to array of printer names
     */
    static getPrinters(apiUrl?: string): Promise<string[]>;
}

export {};
