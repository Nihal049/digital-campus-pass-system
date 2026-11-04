const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generatePassQR } = require('../services/qrService');
const { logAudit } = require('../services/auditService');

async function registerVisitor(req, res) {
  try {
    const { full_name, email, phone, organization, gov_id_type, gov_id_number, purpose, host_user_id, expected_arrival } = req.body;

    if (!full_name || !phone || !purpose) {
      return res.status(400).json({ error: 'Full name, phone, and purpose are required.' });
    }

    const visitorId = `vis-${uuidv4().slice(0, 8)}`;
    const arrivalTime = expected_arrival ? new Date(expected_arrival).toISOString() : new Date().toISOString();

    await db.query(`
      INSERT INTO visitors (
        id, full_name, email, phone, organization, gov_id_type, gov_id_number,
        purpose, host_user_id, expected_arrival, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'INVITED', CURRENT_TIMESTAMP)
    `, [
      visitorId,
      full_name.trim(),
      email ? email.trim() : null,
      phone.trim(),
      organization ? organization.trim() : null,
      gov_id_type ? gov_id_type.trim() : null,
      gov_id_number ? gov_id_number.trim() : null,
      purpose.trim(),
      host_user_id || req.user?.id || null,
      arrivalTime
    ]);

    await logAudit({
      actorId: req.user?.id || null,
      action: 'VISITOR_REGISTERED',
      entityType: 'VISITOR',
      entityId: visitorId,
      details: { full_name, phone, host_user_id },
      ipAddress: req.ip
    });

    const newVisitor = await db.get('SELECT * FROM visitors WHERE id = $1', [visitorId]);

    res.status(201).json({
      message: 'Visitor registered successfully. Awaiting host approval.',
      visitor: newVisitor
    });
  } catch (err) {
    console.error('RegisterVisitor error:', err);
    res.status(500).json({ error: 'Internal server error registering visitor.' });
  }
}

async function getVisitors(req, res) {
  try {
    let query = `
      SELECT v.*, h.name as host_name, h.email as host_email, h.department as host_department,
             p.pass_number, p.valid_from, p.valid_to, p.status as pass_status
      FROM visitors v
      LEFT JOIN users h ON v.host_user_id = h.id
      LEFT JOIN digital_passes p ON v.pass_id = p.id
      WHERE 1=1
    `;
    const params = [];

    // If faculty or student is logged in, show visitors where they are the host
    if (req.user.role === 'FACULTY' || req.user.role === 'STUDENT') {
      params.push(req.user.id);
      query += ` AND v.host_user_id = $${params.length}`;
    }

    query += ` ORDER BY v.created_at DESC`;

    const visitors = await db.all(query, params);
    res.json({ visitors });
  } catch (err) {
    console.error('GetVisitors error:', err);
    res.status(500).json({ error: 'Internal server error fetching visitors.' });
  }
}

async function approveVisitor(req, res) {
  try {
    const { id } = req.params;
    const visitor = await db.get('SELECT * FROM visitors WHERE id = $1', [id]);

    if (!visitor) {
      return res.status(404).json({ error: 'Visitor record not found.' });
    }

    // Create a digital pass for this visitor
    const passId = `pas-${uuidv4().slice(0, 8)}`;
    const passNumber = `VIS-PASS-${Date.now().toString().slice(-6)}`;
    const arrivalTime = visitor.expected_arrival ? new Date(visitor.expected_arrival) : new Date();
    const validUntil = new Date(arrivalTime.getTime() + 8 * 60 * 60 * 1000); // 8 hours validity

    // Create shadow guest user or link to visitor role
    const visitorUser = await db.get("SELECT id FROM users WHERE role = 'VISITOR' LIMIT 1");
    const assignedUserId = visitorUser ? visitorUser.id : req.user.id;

    await db.query(`
      INSERT INTO digital_passes (
        id, pass_number, user_id, pass_type, reason, destination,
        valid_from, valid_to, status, approved_by, approval_notes, approval_time, created_at
      ) VALUES ($1, $2, $3, 'VISITOR_PASS', $4, 'Campus Visitor Lounge & Host Office', $5, $6, 'APPROVED', $7, 'Visitor Approved by Host', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      passId,
      passNumber,
      assignedUserId,
      `Visitor Entry: ${visitor.purpose} (${visitor.full_name})`,
      arrivalTime.toISOString(),
      validUntil.toISOString(),
      req.user.id
    ]);

    // Link pass to visitor and update status
    await db.query(`UPDATE visitors SET status = 'APPROVED', pass_id = $1 WHERE id = $2`, [passId, id]);

    const createdPass = await db.get('SELECT * FROM digital_passes WHERE id = $1', [passId]);
    const qrInfo = await generatePassQR(createdPass);

    await logAudit({
      actorId: req.user.id,
      action: 'VISITOR_APPROVED',
      entityType: 'VISITOR',
      entityId: id,
      details: { visitorName: visitor.full_name, passNumber },
      ipAddress: req.ip
    });

    res.json({
      message: 'Visitor approved. Digital Visitor Pass and QR generated.',
      pass: createdPass,
      qr: qrInfo
    });
  } catch (err) {
    console.error('ApproveVisitor error:', err);
    res.status(500).json({ error: 'Internal server error approving visitor.' });
  }
}

async function updateVisitorStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['CHECKED_IN', 'CHECKED_OUT', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be CHECKED_IN, CHECKED_OUT, or REJECTED.' });
    }

    await db.query('UPDATE visitors SET status = $1 WHERE id = $2', [status, id]);

    await logAudit({
      actorId: req.user.id,
      action: `VISITOR_${status}`,
      entityType: 'VISITOR',
      entityId: id,
      details: { status },
      ipAddress: req.ip
    });

    res.json({ message: `Visitor status updated to ${status}`, visitorId: id });
  } catch (err) {
    console.error('UpdateVisitorStatus error:', err);
    res.status(500).json({ error: 'Internal server error updating visitor status.' });
  }
}

module.exports = {
  registerVisitor,
  getVisitors,
  approveVisitor,
  updateVisitorStatus
};
