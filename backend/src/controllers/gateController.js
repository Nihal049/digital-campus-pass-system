const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { verifyQRPayload } = require('../services/qrService');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

async function verifyPassQR(req, res) {
  try {
    const { qrData, passNumber } = req.body;

    if (!qrData && !passNumber) {
      return res.status(400).json({ error: 'Either qrData payload or passNumber is required.' });
    }

    let verificationResult;

    if (qrData) {
      verificationResult = await verifyQRPayload(qrData);
    } else {
      // Manual pass number lookup by security officer
      const pass = await db.get(`
        SELECT p.*, u.name as user_name, u.reg_no, u.role, u.department, u.phone
        FROM digital_passes p
        JOIN users u ON p.user_id = u.id
        WHERE p.pass_number = $1
      `, [passNumber.trim()]);

      if (!pass) {
        return res.status(404).json({ isValid: false, reason: 'Pass number not found.' });
      }

      const now = new Date();
      const validFrom = new Date(pass.valid_from);
      const validTo = new Date(pass.valid_to);

      if (pass.status !== 'APPROVED') {
        verificationResult = { isValid: false, reason: `Pass status is ${pass.status}, not APPROVED.`, pass };
      } else if (now < validFrom) {
        verificationResult = { isValid: false, reason: `Pass is not yet active. Starts at: ${validFrom.toLocaleString()}`, pass };
      } else if (now > validTo) {
        verificationResult = { isValid: false, reason: `Pass expired on: ${validTo.toLocaleString()}`, pass };
      } else {
        verificationResult = { isValid: true, pass, reason: 'Verified via Pass ID lookup.' };
      }
    }

    // Check if the person is currently inside the campus
    let isCurrentlyInside = false;
    let insideRecord = null;
    if (verificationResult.pass) {
      insideRecord = await db.get('SELECT * FROM currently_inside WHERE person_id = $1', [verificationResult.pass.user_id]);
      isCurrentlyInside = !!insideRecord;
    }

    // Retrieve last scan history for this pass
    let lastScan = null;
    if (verificationResult.pass) {
      lastScan = await db.get(`
        SELECT * FROM gate_scans WHERE pass_id = $1 ORDER BY scanned_at DESC LIMIT 1
      `, [verificationResult.pass.id]);
    }

    res.json({
      ...verificationResult,
      isCurrentlyInside,
      insideRecord,
      lastScan
    });
  } catch (err) {
    console.error('VerifyPassQR error:', err);
    res.status(500).json({ error: 'Internal server error verifying QR.' });
  }
}

async function recordGateScan(req, res) {
  try {
    const { pass_id, gate_name, gate_id, action_type, result, denial_reason } = req.body;
    const scannerUserId = req.user.id;

    if (!pass_id || !gate_name || !action_type || !result) {
      return res.status(400).json({ error: 'pass_id, gate_name, action_type (ENTRY/EXIT), and result (GRANTED/DENIED) are required.' });
    }

    if (!['ENTRY', 'EXIT'].includes(action_type)) {
      return res.status(400).json({ error: 'action_type must be ENTRY or EXIT.' });
    }

    if (!['GRANTED', 'DENIED'].includes(result)) {
      return res.status(400).json({ error: 'result must be GRANTED or DENIED.' });
    }

    const pass = await db.get('SELECT * FROM digital_passes WHERE id = $1', [pass_id]);
    if (!pass) {
      return res.status(404).json({ error: 'Pass not found.' });
    }

    // Verify Movement Direction Constraints
    const insideRecord = await db.get('SELECT * FROM currently_inside WHERE person_id = $1', [pass.user_id]);

    if (result === 'GRANTED') {
      if (action_type === 'ENTRY' && insideRecord) {
        return res.status(400).json({
          error: 'Entry rejected: Person is already recorded as currently inside campus. Consecutive entries without an exit are not permitted.'
        });
      }

      if (action_type === 'EXIT' && !insideRecord) {
        return res.status(400).json({
          error: 'Exit rejected: Person is not recorded as currently inside campus. Entry must be recorded before exit.'
        });
      }
    }

    const scanId = `scn-${uuidv4().slice(0, 8)}`;

    // Atomic transaction for scan logging and currently inside tracking
    await db.transaction(async (tx) => {
      // 1. Record in gate_scans
      await tx.query(`
        INSERT INTO gate_scans (
          id, pass_id, person_id, gate_id, gate_name, scanner_user_id, action_type, result, denial_reason, scanned_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      `, [
        scanId,
        pass_id,
        pass.user_id,
        gate_id || null,
        gate_name.trim(),
        scannerUserId,
        action_type,
        result,
        denial_reason || null
      ]);

      // 2. Update currently_inside table
      if (result === 'GRANTED') {
        if (action_type === 'ENTRY') {
          await tx.query('DELETE FROM currently_inside WHERE person_id = $1', [pass.user_id]);
          await tx.query(`
            INSERT INTO currently_inside (id, person_id, pass_id, gate_id, gate_name, entry_time, last_scan_id)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
          `, [`ins-${uuidv4().slice(0, 8)}`, pass.user_id, pass_id, gate_id || null, gate_name.trim(), scanId]);
        } else if (action_type === 'EXIT') {
          await tx.query('DELETE FROM currently_inside WHERE person_id = $1', [pass.user_id]);
        }
      }
    });

    // 3. Send in-app notification
    if (result === 'GRANTED') {
      await createNotification({
        userId: pass.user_id,
        title: `Gate ${action_type} Logged`,
        message: `Your campus ${action_type.toLowerCase()} was officially verified and recorded at ${gate_name} by Officer ${req.user.name}.`,
        type: 'GATE_SCAN',
        link: '/'
      });
    }

    await logAudit({
      actorId: scannerUserId,
      action: `GATE_SCAN_${action_type}_${result}`,
      entityType: 'GATE_SCAN',
      entityId: scanId,
      details: { passId: pass_id, gateName: gate_name, result, denialReason: denial_reason, officerName: req.user.name },
      ipAddress: req.ip
    });

    res.status(201).json({
      message: `Gate scan recorded: ${action_type} - ${result}`,
      scanId,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('RecordGateScan error:', err);
    res.status(500).json({ error: 'Internal server error recording gate scan.' });
  }
}

async function getScanHistory(req, res) {
  try {
    const { gate_name, action_type, result, limit = 50 } = req.query;

    let query = `
      SELECT s.*, p.pass_number, p.pass_type, p.destination,
             u.name as user_name, u.reg_no, u.department, u.role as user_role,
             guard.name as guard_name
      FROM gate_scans s
      JOIN digital_passes p ON s.pass_id = p.id
      JOIN users u ON p.user_id = u.id
      LEFT JOIN users guard ON s.scanner_user_id = guard.id
      WHERE 1=1
    `;
    const params = [];

    if (gate_name && gate_name !== 'ALL') {
      params.push(gate_name);
      query += ` AND s.gate_name = $${params.length}`;
    }

    if (action_type && action_type !== 'ALL') {
      params.push(action_type);
      query += ` AND s.action_type = $${params.length}`;
    }

    if (result && result !== 'ALL') {
      params.push(result);
      query += ` AND s.result = $${params.length}`;
    }

    params.push(Number(limit));
    query += ` ORDER BY s.scanned_at DESC LIMIT $${params.length}`;

    const scans = await db.all(query, params);

    res.json({ scans });
  } catch (err) {
    console.error('GetScanHistory error:', err);
    res.status(500).json({ error: 'Internal server error fetching scan history.' });
  }
}

module.exports = {
  verifyPassQR,
  recordGateScan,
  getScanHistory
};
