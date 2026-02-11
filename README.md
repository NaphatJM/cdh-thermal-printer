# CDH Thermal Printer

A JavaScript library for controlling ESC/POS thermal printers with support for Thai text rendering.

## Installation

```bash
npm install @naphatjm/cdh-thermal-printer
```

## Usage

### Basic Setup

```javascript
import { ThermalPrinter } from "@naphatjm/cdh-thermal-printer";

// ✨ No need to specify driver URL - auto-discovers on localhost:9123-9130
const printer = new ThermalPrinter(384);
// 384 is paper width (58mm)

printer
    .init()
    .align(1) // center
    .bold(true)
    .printThaiText("สวัสดีครับ")
    .feed(2)
    .cut()
    .print("Printer Name");
```

### Get Available Printers

```javascript
// Auto-discovers driver automatically
const printers = await ThermalPrinter.getPrinters();
console.log(printers);
```

**Response Example:**

```json
[
    {
        "name": "thermal printer",
        "driver": "Generic / Text Only",
        "port": "USB001",
        "vid": "VID_0FE6",
        "pid": "PID_811E",
        "status_text": "Ready"
    },
    {
        "name": "HP LaserJet M1530 MFP Series PCL 6",
        "driver": "HP LaserJet M1530 MFP Series PCL 6",
        "port": "HPLaserJetM1536dnfMFP",
        "vid": "",
        "pid": "",
        "status_text": "Ready"
    },
    {
        "name": "Microsoft Print to PDF",
        "driver": "Microsoft Print To PDF",
        "port": "PORTPROMPT:",
        "vid": "",
        "pid": "",
        "status_text": "Ready"
    }
]
```

### Get Printers by VID/PID

```javascript
// Get thermal printers with specific VID/PID (recommended for fixed printers)
const thermalPrinters = await ThermalPrinter.getPrinters_filterByVidPid(
    "VID_0FE6",
    "PID_811E"
);

if (thermalPrinters.length > 0) {
    console.log(thermalPrinters[0].name); // "Thermal Printer"
}
```

**Why use VID/PID?** When you have multiple USB thermal printers, VID/PID ensures you always print to the correct device:

```javascript
const printer = new ThermalPrinter();

printer
    .init()
    .line("Hello World")
    .feed(2)
    .cut();

// ✅ Safe: Always prints to the specific thermal printer
await printer.print_fixId("VID_0FE6", "PID_811E");

// ❌ Risky: Might print to wrong device if multiple printers exist
const printers = await ThermalPrinter.getPrinters();
await printer.print(printers[0].name);
```

### Print Receipt (Full Example)

```javascript
const printer = new ThermalPrinter(384);

// Get available printers (auto-discovers driver)
const printers = await ThermalPrinter.getPrinters();
const printerName = printers[0].name;

// Build receipt
printer
    .clear()
    .init()
    .align(1)
    .bold(true)
    .line("ร้านค้าทดสอบ")
    .bold(false)
    .divider("-", 32)
    .line("รายการสินค้า:")
    .line("1. ข้าวมันไก่     50.-")
    .line("2. ชานมไข่มุก     35.-")
    .divider("-", 32)
    .align(2)
    .line("รวม: 85.-")
    .align(1)
    .newline(2)
    .line("ขอบคุณค่ะ")
    .feed(3)
    .cut();

// Send to printer (auto-discovers driver)
await printer.print(printerName);
```

### Print Image (QR Code, Logo, etc.)

```javascript
const printer = new ThermalPrinter(384);

// Create canvas and draw image
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 384;
canvas.height = 200;

// White background
ctx.fillStyle = "white";
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Draw image (e.g., QR code from img tag)
const qrImg = document.getElementById("qrcode");
ctx.drawImage(qrImg, 150, 20, 100, 100);

// Get image data and print
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

// Send to printer (auto-discovers driver)
const printers = await ThermalPrinter.getPrinters();
printer
    .init()
    .align(1)
    .image(imageData) // Print the image
    .feed(2)
    .cut()
    .print(printers[0].name);
```

### Print QR Code (Advanced Example)

```javascript
import QRCode from "qrcode";

const printer = new ThermalPrinter(384);
const canvas = document.createElement("canvas");

// Generate QR code (any size, will be auto-padded)
await QRCode.toCanvas(canvas, "https://example.com", {
    width: 300, // ✨ Auto-pads to 304px (multiple of 8)
    margin: 2,
    color: {
        dark: "#000000",
        light: "#FFFFFF",
    },
});

// Extract image data
const imageData = canvas
    .getContext("2d")
    ?.getImageData(0, 0, canvas.width, canvas.height);

// Send to printer (auto-discovers driver)
const printers = await ThermalPrinter.getPrinters();
printer
    .init()
    .align(1)
    .image(imageData) // ← Handles any width automatically
    .feed(2)
    .cut()
    .print(printers[0].name);
```

## ⚠️ Important: Font Setup for Thai Text

When using `printThaiText()` or `textToImageData()`, you **must** load the Sarabun font in your HTML file:

```html
<link
    href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap"
    rel="stylesheet" />
```

Without this link, the printer will use the default system font instead of Sarabun.

## How Auto-Discovery Works

The library automatically scans for the printer driver on ports 9123-9130:

```javascript
const printer = new ThermalPrinter(384);

// First call to print() triggers auto-discovery
// Scans localhost:9123 → 9130 for CDH-Driver service
// Caches the discovered URL for future calls
await printer.print("Printer Name");

// Subsequent calls reuse the cached URL
await printer.print("Another Printer");

// Reconnects automatically if connection is lost
```

**Manual Discovery (if needed):**

```javascript
const printer = new ThermalPrinter(384);

// Explicitly find driver
const found = await printer.findDriver();
if (!found) {
    console.error(
        "Driver not found. Please run the printer driver application.",
    );
}

// Now proceed with printing
await printer.print("Printer Name");
```

## Converting Thai Text (Client-side Helper)

For **server-side printing** with Thai text, use the `textToImageData()` utility function to render text on the client, then send the image data to your server API.

### Client-side (React/Next.js):

```javascript
import { textToImageData } from "@naphatjm/cdh-thermal-printer";

// Convert Thai text to image data
const imageData = textToImageData("สวัสดีครับ", 384, 22);

// Send image data to server API
const response = await fetch("/api/print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        imageData: {
            data: Array.from(imageData.data),
            width: imageData.width,
            height: imageData.height,
        },
        printerName: "EPSON TM-58",
    }),
});
```

### Server-side (Next.js API Route):

```javascript
// pages/api/print.js
import { ThermalPrinter } from "@naphatjm/cdh-thermal-printer";

export default function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const { imageData, printerName } = req.body;

    // Convert JSON data back to ImageDataLike object
    const imageDataLike = {
        data: new Uint8ClampedArray(imageData.data),
        width: imageData.width,
        height: imageData.height,
    };

    // Print using server-side library (auto-discovers driver)
    const printer = new ThermalPrinter();
    try {
        printer.init().image(imageDataLike).feed(3).cut().print(printerName);

        res.status(200).json({ message: "✅ Print successful" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
```

## ImageDataLike Interface

For **server-side usage**, the `image()` method accepts an object that matches this structure instead of requiring the native ImageData:

```typescript
interface ImageDataLike {
    data: Uint8ClampedArray | number[];
    width: number;
    height: number;
}
```

**Why?** Node.js doesn't have the `ImageData` constructor, so use a plain object instead:

```javascript
const imageDataLike = {
    data: new Uint8ClampedArray([...pixelData]),
    width: 384,
    height: 100,
};

printer.image(imageDataLike).print("Printer Name");
```

## Complete Next.js Example

### Step 1: Load Font in Layout

```html
<!-- app/layout.tsx -->
<head>
    <link
        href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap"
        rel="stylesheet" />
</head>
```

### Step 2: Client Page Component

```typescript
// app/print/page.tsx
"use client";
import { textToImageData } from "@naphatjm/cdh-thermal-printer";
import { useState } from "react";

export default function PrintPage() {
    const [loading, setLoading] = useState(false);

    const handlePrint = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const text = (e.currentTarget.elements.namedItem("text") as HTMLInputElement).value;

        try {
            // 1. Client-side: Convert Thai text to image
            const imageData = textToImageData(text, 384, 22);

            // 2. Send to API
            const response = await fetch("/api/print", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageData: {
                        data: Array.from(imageData.data),
                        width: imageData.width,
                        height: imageData.height,
                    },
                    printerName: "EPSON TM-58",
                }),
            });

            const result = await response.json();
            alert(result.message || "✅ Print successful");
        } catch (error) {
            alert(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "20px" }}>
            <h1>🖨️ Print Thai Text</h1>
            <form onSubmit={handlePrint}>
                <textarea
                    name="text"
                    placeholder="Enter Thai text to print..."
                    defaultValue="สวัสดีครับ"
                    style={{ width: "100%", height: "100px" }}
                />
                <br />
                <button type="submit" disabled={loading}>
                    {loading ? "⏳ Printing..." : "🖨️ Print"}
                </button>
            </form>
        </div>
    );
}
```

### Step 3: API Route Handler

```typescript
// app/api/print/route.ts
import { ThermalPrinter } from "@naphatjm/cdh-thermal-printer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { imageData, printerName } = await req.json();

        // Convert JSON to ImageDataLike
        const imageDataLike = {
            data: new Uint8ClampedArray(imageData.data),
            width: imageData.width,
            height: imageData.height,
        };

        // Use server-side printer
        const printer = new ThermalPrinter();
        printer.init().image(imageDataLike).feed(3).cut();

        await printer.print(printerName);

        return NextResponse.json({ message: "✅ Print successful" });
    } catch (error) {
        console.error("Print error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
        );
    }
}
```

## Customization Options

### What You Can Customize

| Feature               | Parameter/Method                         | Options                          | Default               |
| --------------------- | ---------------------------------------- | -------------------------------- | --------------------- |
| **Paper Width**       | Constructor `width`                      | 384 (58mm) / 576 (80mm) / custom | 384                   |
| **API URL**           | Constructor `driverApiUrl`               | Any URL                          | http://localhost:9123 |
| **Font Size (Thai)**  | `printThaiText(text, fontSize)`          | Any number (px)                  | 22                    |
| **Font Size (Image)** | `textToImageData(text, width, fontSize)` | Any number (px)                  | 22                    |
| **Canvas Width**      | `textToImageData(text, width)`           | Any number (px)                  | 384                   |
| **Text Alignment**    | `align(alignment)`                       | 0=Left, 1=Center, 2=Right        | 1 (Center)            |
| **Bold Text**         | `bold(enable)`                           | true / false                     | true                  |
| **Paper Feed**        | `feed(lines)`                            | Any number                       | 1                     |
| **Cut Type**          | `cut(partial)`                           | true=Partial, false=Full         | false (Full)          |
| **Divider Style**     | `divider(char, width)`                   | Any char + count                 | "-", 32               |
| **Custom Text**       | `line(text)`                             | Any text                         | ""                    |
| **Blank Lines**       | `newline(count)`                         | Any number                       | 1                     |
| **Beep Sound**        | `beep(times, duration)`                  | times + ms                       | 1, 100ms              |
| **Custom Image**      | `image(imageData)`                       | ImageData / ImageDataLike        | -                     |
| **Raw Commands**      | `raw(bytes)`                             | ESC/POS bytes                    | -                     |

### What's Fixed (For Compatibility)

| Feature                        | Value            | Reason                    |
| ------------------------------ | ---------------- | ------------------------- |
| **Thai Font**                  | Sarabun only     | Consistency & readability |
| **Line Height**                | fontSize + 12px  | Standard spacing          |
| **Pixel Brightness Threshold** | 380              | Black/White conversion    |
| **Cash Drawer Pins**           | 0x00, 0x0c, 0x78 | ESC/POS standard          |

### Examples of Customization

#### Custom Paper Width (80mm)

```javascript
const printer = new ThermalPrinter(576); // 80mm instead of 58mm (default 384)

printer.init().line("Wide receipt").feed(2).cut().print("Printer");
```

#### Custom Font Size for Thai Text

```javascript
const printer = new ThermalPrinter();

printer
    .init()
    .bold(true)
    .printThaiText("ขนาดใหญ่", 28) // 28px instead of default 22px
    .bold(false)
    .divider("*", 40) // Custom divider
    .feed(3)
    .cut()
    .print("Printer");
```

#### Custom Divider and Alignment

```javascript
const printer = new ThermalPrinter();

printer
    .init()
    .align(2) // Right align
    .divider("=", 30) // Different style
    .line("Item 1     100.-")
    .line("Item 2     200.-")
    .divider("-", 20) // Different width
    .align(1) // Center align
    .line("Total: 300.-")
    .feed(5)
    .cut(true) // Partial cut instead of full
    .print("Printer");
```

#### Mixed Customizations

```javascript
const printer = new ThermalPrinter(576); // 80mm (auto-discovers driver)

printer
    .init()
    .align(1) // Center
    .bold(true)
    .printThaiText("ร้านค้า XYZ", 26) // Bigger font
    .bold(false)
    .divider("=", 50)
    .line("พิมพ์บันทึก")
    .divider("-", 40)
    .line("สินค้า 1     150.-")
    .line("สินค้า 2     250.-")
    .line("สินค้า 3     100.-")
    .divider("-", 40)
    .align(2) // Right align total
    .bold(true)
    .line("รวม:     500.-")
    .bold(false)
    .align(1)
    .newline(2)
    .line("ขอบคุณที่มาใช้บริการ")
    .feed(4)
    .cut(true) // Partial cut
    .beep(1, 200) // Single beep
    .print("Receipt Printer");
```

## Usage Patterns

### Pattern 1: Client-side Direct Printing

```javascript
// Simple, all processing on client
printer.init().printThaiText("สวัสดี").feed(2).cut().print("Printer Name");
```

### Pattern 2: Client Render → Server Print (Recommended for production)

```javascript
// 1. Client renders
const imageData = textToImageData("สวัสดี", 384, 22);

// 2. Send to server
await fetch("/api/print", { body: JSON.stringify(imageData) });

// 3. Server prints (more secure & flexible)
printer.image(imageDataLike).print("Printer Name");
```

### Pattern 3: Custom Image Printing

```javascript
// Use with QR codes, logos, or custom images
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
// ... draw custom content ...
const imageData = ctx.getImageData(0, 0, 384, 200);

printer.image(imageData).print("Printer Name");
```

## Usage Matrix (Quick Reference)

| Scenario               | Method                          | Location                       | Example                              |
| ---------------------- | ------------------------------- | ------------------------------ | ------------------------------------ |
| **English text**       | `line()`                        | Server or Client               | `printer.line("Hello")`              |
| **Thai text (direct)** | `printThaiText()`               | Client only                    | `printer.printThaiText("สวัสดี")`    |
| **Thai text (API)**    | `textToImageData()` + `image()` | Client converts, Server prints | See Complete Example                 |
| **Image/QR Code**      | `image()`                       | Server or Client               | `printer.image(imageData)`           |
| **Get printers**       | `getPrinters()`                 | Server or Client               | `await ThermalPrinter.getPrinters()` |

## ⚠️ Common Issues & Troubleshooting

### Issue: "Browser environment required for printThaiText"

**Problem:** Using `printThaiText()` on server-side (Node.js)

**Solution:** Use `textToImageData()` on client instead

```javascript
// ❌ WRONG - Server can't use printThaiText
printer.printThaiText("สวัสดี");

// ✅ RIGHT - Client converts, server prints
const imageData = textToImageData("สวัสดี");
// ... send to server ...
printer.image(imageDataLike);
```

### Issue: Only "@" symbols print instead of Thai text

**Problem:** Sending Thai text directly without rendering to image

**Solution:** Always convert Thai text to image first

```javascript
// ❌ WRONG
printer.line("สวัสดี"); // Will print as gibberish

// ✅ RIGHT
printer.printThaiText("สวัสดี"); // Client-side
// OR
const imageData = textToImageData("สวัสดี"); // Convert first
```

### Issue: Thai text looks like default font, not Sarabun

**Problem:** Sarabun font not loaded in HTML

**Solution:** Add font link to your HTML `<head>`

```html
<!-- ✅ Add this to your HTML -->
<link
    href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap"
    rel="stylesheet" />
```

### Issue: "ImageData is not defined" in Node.js

**Problem:** Trying to use browser ImageData in Node.js

**Solution:** Use ImageDataLike object instead

```javascript
// ❌ WRONG - ImageData doesn't exist in Node.js
const img = new ImageData(...);

// ✅ RIGHT - Use plain object
const imageDataLike = {
    data: new Uint8ClampedArray([...]),
    width: 384,
    height: 100,
};
printer.image(imageDataLike);
```

### Issue: QR Code prints blurry or corrupted

**Problem:** QR code width not compatible with thermal printer (not multiple of 8 pixels)

**Solution:** Library auto-pads any width - no need to manually adjust

```javascript
// ✅ Works - Any size QR code
const qrCanvas = document.createElement("canvas");
await QRCode.toCanvas(qrCanvas, "https://example.com", { width: 300 }); // 300px QR
const imageData = qrCanvas.getContext("2d")?.getImageData(0, 0, 300, 300);
printer.image(imageData); // Auto-pads to 304px (38 bytes × 8 = 304px)

// ✅ Also works
await QRCode.toCanvas(qrCanvas, "https://example.com", { width: 256 }); // 256px QR
// Auto-pads to 256px (already multiple of 8)
```

**How it works:**

- QR 300px → padded to 304px (38 bytes)
- QR 256px → padded to 256px (32 bytes, already aligned)
- QR 210px → padded to 216px (27 bytes)

### Issue: QR Code prints as solid black or white square

**Problem:** Image brightness threshold doesn't match QR code contrast

**Solution:** QR codes use pure black (0) and pure white (255), threshold of 382 is perfect for them

```javascript
// This should work out-of-the-box
const imageData = canvas
    .getContext("2d")
    ?.getImageData(0, 0, canvas.width, canvas.height);
printer.image(imageData); // Uses default threshold 382 (0-765 scale)

// If custom image needs adjustment (not typical)
// Advanced: Can be customized in convertCanvasToEscPos() function
```

### Issue: TextToImageData throws error on server

**Problem:** `textToImageData()` requires browser Canvas API

**Solution:** Always call `textToImageData()` on client-side only

```javascript
// ❌ WRONG - Server has no Canvas
// (server-side code)
const imageData = textToImageData("สวัสดี");

// ✅ RIGHT - Client calls it
// (client-side React component)
const imageData = textToImageData("สวัสดี");
await fetch("/api/print", { body: JSON.stringify(imageData) });
```

## API Reference

### Constructor

```javascript
new ThermalPrinter((width = 384));
```

- `width`: Printer width in dots (384 = 58mm, 576 = 80mm, default: 384)

The driver URL is **auto-discovered** on ports 9123-9130 when first needed.

### Utility Functions

#### `textToImageData(text, width, fontSize)`

Converts Thai text to ImageData for use with `image()` method or server-side printing.

**Parameters:**

- `text` (string) - Thai text to convert
- `width` (number, default: 384) - Canvas width in pixels
- `fontSize` (number, default: 22) - Font size in pixels

**Returns:** ImageData object

**Example:**

```javascript
const imageData = textToImageData("สวัสดี", 384, 22);
// Use with image() method
printer.image(imageData).print();
```

### Instance Methods

#### Text & Formatting

- `init()` - Initialize printer (ESC @)
- `align(alignment)` - Set text alignment (0=Left, 1=Center, 2=Right)
- `bold(enable)` - Enable/disable bold text (true/false)
- `line(text)` - Add line of text with newline
- `newline(count)` - Add blank lines (default: 1)
- `divider(char, width)` - Add separator line (e.g., `divider("-", 32)`)

#### Paper & Output

- `feed(lines)` - Feed paper by specified lines (default: 1)
- `cut(partial)` - Cut paper (true=partial, false=full cut)
- `beep(times, duration)` - Beep speaker (times: count, duration: milliseconds)
- `drawerKick()` - Open cash drawer

#### Image & Printing

- `image(imageData)` - Print image from canvas ImageData or ImageDataLike object
    - **Auto-adjusts width:** Any image width is automatically padded to multiple of 8 pixels
    - **QR Code friendly:** Supports any QR code size (300px, 256px, etc.)
    - **Smart brightness detection:** Uses configurable threshold (default: 382) to convert to black/white
    - **Supports:** QR codes, logos, barcodes, custom graphics

    ```javascript
    // Works with any image size
    const imageData = canvas.getContext("2d")?.getImageData(0, 0, 300, 300); // 300px QR
    printer.image(imageData); // Auto-pads to 304px
    ```

- `printThaiText(text, fontSize)` - Print Thai text with automatic image rendering (client-side only, default fontSize: 22px)
- `raw(bytes)` - Send raw byte array

#### Buffer Management

- `clear()` - Clear all buffered commands
- `getBuffer()` - Get current buffer as Uint8Array
- `findDriver()` - Auto-discover printer driver on localhost:9123-9130, caches result
- `print(printerName)` - Send buffered commands to printer (triggers auto-discovery if needed)

- `async print_fixId(vid, pid)` - Send buffered commands to a specific printer using Vendor ID and Product ID

    **Parameters:**
    - `vid` (string) - Vendor ID (e.g., "VID_0FE6")
    - `pid` (string) - Product ID (e.g., "PID_811E")

    **Returns:** Promise with print result

    **Example:**

    ```javascript
    const printer = new ThermalPrinter();

    printer
        .init()
        .align(1)
        .bold(true)
        .line("Receipt")
        .bold(false)
        .divider("-", 32)
        .line("Item 1     50.-")
        .line("Item 2     35.-")
        .divider("-", 32)
        .line("Total:     85.-")
        .feed(3)
        .cut();

    // Print to specific thermal printer by VID/PID
    await printer.print_fixId("VID_0FE6", "PID_811E");
    ```

    **Why use this?** When you have multiple USB thermal printers, use VID/PID to ensure the correct printer is selected automatically

### Static Methods

- `static async getPrinters(overrideUrl)` - Get list of available printers from Windows/system

    **Returns:** Array of PrinterInfo objects

    ```typescript
    interface PrinterInfo {
        name: string;
        driver: string;
        port: string;
        vid: string;       // Vendor ID (e.g., "VID_0FE6")
        pid: string;       // Product ID (e.g., "PID_811E")
        status_text: string;
    }
    ```

    **Example:**

    ```javascript
    const printers = await ThermalPrinter.getPrinters();
    // [
    //   { name: "thermal printer", driver: "Generic / Text Only", port: "USB001", vid: "VID_0FE6", pid: "PID_811E", status_text: "Ready" },
    //   { name: "HP LaserJet M1530 MFP Series PCL 6", driver: "HP LaserJet M1530 MFP Series PCL 6", vid: "", pid: "", ... },
    //   ...
    // ]

    // Filter for thermal printers only
    const thermalPrinters = printers.filter((p) =>
        p.name.toLowerCase().includes("thermal"),
    );

    // Or with override URL (for custom server)
    const printers = await ThermalPrinter.getPrinters(
        "http://custom-driver:9123",
    );
    ```

- `static async getPrinters_filterByVidPid(vid, pid, overrideUrl)` - Get list of printers filtered by Vendor ID and Product ID

    **Parameters:**
    - `vid` (string) - Vendor ID (e.g., "VID_0FE6")
    - `pid` (string) - Product ID (e.g., "PID_811E")
    - `overrideUrl` (string, optional) - Custom driver URL

    **Returns:** Array of matching PrinterInfo objects

    **Example:**

    ```javascript
    // Get only thermal printers with specific VID/PID
    const thermalPrinters = await ThermalPrinter.getPrinters_filterByVidPid(
        "VID_0FE6",
        "PID_811E"
    );
    console.log(thermalPrinters[0].name); // "Thermal Printer"

    // This is useful when you have multiple USB thermal printers
    // and want to ensure you're printing to the right one
    ```

## Fluent API

All methods return `this`, allowing for method chaining:

```javascript
printer
    .init()
    .align(1)
    .bold(true)
    .line("Header")
    .bold(false)
    .divider()
    .feed(2)
    .cut();
```

## Environment Notes

### Client-side (Browser)

✅ Has Canvas API  
✅ Has DOM (document, window)  
✅ Has Fonts (Sarabun)  
✅ Has ImageData constructor  
**Use:** `printThaiText()`, `textToImageData()`

### Server-side (Node.js)

❌ No Canvas API  
❌ No DOM  
❌ No Fonts  
❌ No ImageData constructor  
**Use:** `image()` with ImageDataLike, `image()` with image data from client

## License

MIT
