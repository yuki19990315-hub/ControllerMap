import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height) {
  // Raw RGBA scanlines
  // Each scanline has 1 filter byte (0) + width * 4 bytes
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      // Compute distance from center for a sleek dark circle / squircle badge
      const cx = width / 2;
      const cy = height / 2;
      const dx = (x - cx) / (width * 0.45);
      const dy = (y - cy) / (height * 0.45);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1.0) {
        // Inside controller badge
        if (dist > 0.95) {
          // Border
          rawData[pxOffset] = 99;     // R
          rawData[pxOffset + 1] = 102; // G
          rawData[pxOffset + 2] = 241; // B
          rawData[pxOffset + 3] = 255; // A (Indigo border)
        } else if (dist < 0.25) {
          // Center highlight
          rawData[pxOffset] = 16;     // R
          rawData[pxOffset + 1] = 185; // G
          rawData[pxOffset + 2] = 129; // B
          rawData[pxOffset + 3] = 255; // A (Emerald)
        } else {
          // Dark background
          rawData[pxOffset] = 24;
          rawData[pxOffset + 1] = 24;
          rawData[pxOffset + 2] = 27;
          rawData[pxOffset + 3] = 255;
        }
      } else {
        // Outside rounded icon
        rawData[pxOffset] = 9;
        rawData[pxOffset + 1] = 9;
        rawData[pxOffset + 2] = 11;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  // Compress with zlib
  const deflated = zlib.deflateSync(rawData);

  // Helper to build a PNG chunk
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    // Simple CRC32
    crc.writeInt32BE(crc32(typeAndData), 0);

    return Buffer.concat([len, typeAndData, crc]);
  }

  // CRC32 implementation
  function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
      }
    }
    return ~c;
  }

  // Header chunk IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', deflated);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180));

console.log('PNG icon assets generated successfully in public/');
