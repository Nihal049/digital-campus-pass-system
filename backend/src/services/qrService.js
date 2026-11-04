const crypto = require('crypto');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const QR_SECRET = process.env.QR_SECRET || 'qr-crypto-signature-key-2026';

/**
 * Creates a cryptographically signed QR token for an approved digital pass.
 */
async function generatePassQR(pass) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const payloadString = `${pass.id}:${pass.user_id}:${pass.valid_from}:${pass.valid_to}:${nonce}`;

  const hmac = crypto.createHmac('sha256', QR_SECRET);
  hmac.update(payloadString);
  const signature = hmac.digest('hex');

  const tokenId = `tok-${uuidv4().slice(0, 8)}`;

  // Deactivate any existing tokens for this pass
  await db.query('UPDATE qr_tokens SET is_active = false WHERE pass_id = $1', [pass.id]);

  // Insert active token in PostgreSQL
  await db.query(`
    INSERT INTO qr_tokens (id, pass_id, token_signature, nonce, issued_at, expires_at, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, true)
  `, [
    tokenId,
    pass.id,
    signature,
    nonce,
    new Date().toISOString(),
    pass.valid_to
  ]);

  // The QR code content encodes structured verification data
  // Does not expose sensitive personal info like phone numbers or home addresses
  const qrData = JSON.stringify({
    passId: pass.id,
    passNumber: pass.pass_number,
    userId: pass.user_id,
    nonce,
    sig: signature
  });

  const qrDataUrl = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });

  return {
    tokenId,
    qrData,
    qrDataUrl
  };
}

/**
 * Validates a scanned QR payload against PostgreSQL database records,
 * cryptographic signature, and time windows.
 */
async function verifyQRPayload(scannedText) {
  let parsed;
  try {
    parsed = typeof scannedText === 'string' ? JSON.parse(scannedText) : scannedText;
  } catch (err) {
    return {
      isValid: false,
      reason: 'Malformed QR Code format. Unable to parse JSON.'
    };
  }

  const { passId, passNumber, userId, nonce, sig } = parsed;

  if (!passId || !nonce || !sig) {
    return {
      isValid: false,
      reason: 'Missing security tokens in QR code.'
    };
  }

  // Fetch the pass and its user details from PostgreSQL
  const pass = await db.get(`
    SELECT p.*, u.name as user_name, u.reg_no, u.role, u.department, u.phone
    FROM digital_passes p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = $1
  `, [passId]);

  if (!pass) {
    return {
      isValid: false,
      reason: 'Pass record not found in system database.'
    };
  }

  // Check pass status
  if (pass.status !== 'APPROVED') {
    return {
      isValid: false,
      reason: `Pass is currently ${pass.status}, not APPROVED. Access denied.`,
      pass
    };
  }

  // Check temporal validity
  const now = new Date();
  const validFrom = new Date(pass.valid_from);
  const validTo = new Date(pass.valid_to);

  if (now < validFrom) {
    return {
      isValid: false,
      reason: `Pass is not yet active. Valid from: ${validFrom.toLocaleString()}`,
      pass
    };
  }

  if (now > validTo) {
    return {
      isValid: false,
      reason: `Pass has expired on: ${validTo.toLocaleString()}`,
      pass
    };
  }

  // Check active token in PostgreSQL
  const activeToken = await db.get(`
    SELECT * FROM qr_tokens
    WHERE pass_id = $1 AND nonce = $2 AND is_active = true
  `, [passId, nonce]);

  if (!activeToken) {
    return {
      isValid: false,
      reason: 'QR token has been revoked or invalidated.',
      pass
    };
  }

  // Verify HMAC-SHA256 signature
  const payloadString = `${pass.id}:${pass.user_id}:${pass.valid_from}:${pass.valid_to}:${nonce}`;
  const hmac = crypto.createHmac('sha256', QR_SECRET);
  hmac.update(payloadString);
  const expectedSignature = hmac.digest('hex');

  if (sig !== expectedSignature) {
    return {
      isValid: false,
      reason: 'Cryptographic signature mismatch! Possible forged or tampered QR code.',
      pass
    };
  }

  return {
    isValid: true,
    pass,
    reason: 'Valid and verified.'
  };
}

module.exports = {
  generatePassQR,
  verifyQRPayload
};
