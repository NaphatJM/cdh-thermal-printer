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
 * Printer information from Windows/system
 */
export interface PrinterInfo {
    name: string;
    driver: string;
    port: string;
    status_text: string;
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
 * ThermalPrinter Service with Auto-Discovery
 * Fluent API for controlling thermal printer with ESC/POS commands
 * Automatically discovers printer driver on ports 9123-9130
 *
 * @example
 * ```javascript
 * const printer = new ThermalPrinter(384);  // 384 dots = 58mm (default)
 * printer
 *     .init()
 *     .align(1)
 *     .printThaiText("สวัสดี")
 *     .feed(2)
 *     .cut()
 *     .print("Printer Name");  // Auto-discovers driver
 * ```
 */
export class ThermalPrinter {
    /**
     * Initialize ThermalPrinter instance with auto-discovery
     * @param width - Printer width in dots (384 = 58mm, 576 = 80mm, default: 384)
     */
    constructor(width?: number);

    /**
     * Driver API URL (null until driver is discovered)
     */
    driverApi: string | null;

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
     * Auto-discover printer driver on localhost:9123-9130
     * Performs health check and verifies it's a CDH-Driver service
     * Caches discovered URL for subsequent calls
     *
     * @returns Promise<boolean> - true if driver found, false otherwise
     * @throws Error if driver not found after scanning all ports
     */
    findDriver(): Promise<boolean>;

    /**
     * Print to specific printer (auto-discovers driver if needed)
     * @param printerName - Name of printer to print to (optional, will use first available if not provided)
     * @returns Promise resolving to print response
     * @throws Error if driver not found or print failed
     */
    print(printerName?: string): Promise<PrintResponse>;

    // --- Static Methods ---

    /**
     * Get list of available printers from Windows/system
     * Auto-discovers driver if URL not provided
     * @param overrideUrl - Driver API URL (optional, will auto-discover if not provided)
     * @returns Promise resolving to array of PrinterInfo objects
     *
     * @example
     * ```javascript
     * const printers = await ThermalPrinter.getPrinters();
     * // [
     * //   { name: "thermal printer", driver: "Generic / Text Only", port: "USB001", status_text: "Ready" },
     * //   { name: "HP LaserJet M1530 MFP Series PCL 6", ... },
     * //   ...
     * // ]
     * ```
     */
    static getPrinters(overrideUrl?: string): Promise<PrinterInfo[]>;
}

export {};
