import Tesseract from 'tesseract.js';

/**
 * Runs Tesseract OCR on a base64 image and returns raw text.
 */
async function runOCR(base64Image) {
  const { data: { text } } = await Tesseract.recognize(base64Image, 'eng', {
    logger: () => {}, // suppress logs
  });
  return text;
}

/**
 * Parses raw OCR text into structured receipt data.
 */
function parseReceiptText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // --- Merchant: first non-empty line ---
  const merchant = lines[0] || 'Unknown Merchant';

  // --- Date: look for common date patterns ---
  const dateRegex = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})\b/;
  let date = null;
  for (const line of lines) {
    const m = line.match(dateRegex);
    if (m) { date = m[1]; break; }
  }

  // --- Total: last occurrence of a currency-like amount ---
  const amountRegex = /(?:total|amount|grand total|subtotal|paid)?[\s:]*(?:₦|NGN|N|\$|#|=N=)?\s*(\d{1,6}[.,]\d{2})/i;
  let total = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(amountRegex);
    if (m) { total = m[1]; break; }
  }

  // --- Amount Paid: look for amount paid or default to total ---
  const paidRegex = /(?:amount\s*paid|paid\s*amount|paid|amt\s*paid|received|payment)[:\s]*(?:₦|NGN|N|\$|#|=N=)?\s*(\d{1,6}[.,]\d{2})/i;
  let amountPaid = null;
  for (const line of lines) {
    const m = line.match(paidRegex);
    if (m) { amountPaid = m[1]; break; }
  }
  if (!amountPaid) amountPaid = total || '0.00';

  // --- Serial Number: look for serial number patterns ---
  const serialRegex = /(?:serial\s*(?:no|num|number)?|s\/n|sl\s*no)[:\s]*([a-z0-9-]+)/i;
  let serialNumber = null;
  for (const line of lines) {
    const m = line.match(serialRegex);
    if (m) { serialNumber = m[1]; break; }
  }
  if (!serialNumber) {
    // Generate a fallback serial number (e.g. SN-XXXXXX)
    serialNumber = "SN-" + Math.floor(100000 + Math.random() * 900000);
  }

  // --- Transaction ID: look for transaction id patterns ---
  const txnRegex = /(?:transaction\s*(?:id|no|num)?|txn\s*(?:id|no|num)?|txid|ref(?:erence)?|receipt\s*(?:no|num|number)?)[:\s]*([a-z0-9-]+)/i;
  let transactionId = null;
  for (const line of lines) {
    const m = line.match(txnRegex);
    if (m) { transactionId = m[1]; break; }
  }
  if (!transactionId) {
    // Generate a fallback transaction ID (e.g. TXN-XXXXXXXX)
    transactionId = "TXN-" + Math.floor(10000000 + Math.random() * 90000000);
  }

  // --- Items: lines that look like "item name ... price" ---
  const itemRegex = /^(.+?)\s+(?:₦|NGN|N|\$|#|=N=)?\s*(\d+[.,]\d{2})$/i;
  const items = [];
  for (const line of lines) {
    const m = line.match(itemRegex);
    if (m && m[1].length > 1) {
      items.push({ name: m[1].trim(), price: m[2] });
    }
  }

  return {
    merchant,
    date: date || new Date().toISOString().split('T')[0],
    total: total || '0.00',
    amountPaid,
    serialNumber,
    transactionId,
    items,
  };
}

/**
 * Main processor: takes a base64 image, runs OCR, returns structured data + dimensions.
 * @param {string} base64Image - data URL or raw base64 JPEG/PNG
 * @returns {Promise<{ extractedData: object, metadata: object }>}
 */
export async function processReceipt(base64Image) {
  // Get image dimensions
  const dimensions = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = base64Image;
  });

  const rawText = await runOCR(base64Image);
  const extractedData = parseReceiptText(rawText);

  return {
    extractedData,
    metadata: {
      dimensions,
      rawText,
    },
  };
}

export default processReceipt;
