const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generatePassQR } = require('../services/qrService');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { sendEmail } = require('../services/emailService');

function generatePassNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PASS-${dateStr}-${rand}`;
}

async function requestPass(req, res) {
  try {
    const { pass_type, reason, destination, valid_from, valid_to } = req.body;
    const userId = req.user.id;

    if (!pass_type || !reason || !destination || !valid_from || !valid_to) {
      return res.status(400).json({ error: 'All fields (pass_type, reason, destination, valid_from, valid_to) are required.' });
    }

    const fromDate = new Date(valid_from);
    const toDate = new Date(valid_to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format for valid_from or valid_to.' });
    }

    if (toDate <= fromDate) {
      return res.status(400).json({ error: 'valid_to must be after valid_from.' });
    }

    const passId = `pas-${uuidv4().slice(0, 8)}`;
    const passNumber = generatePassNumber();

    // Check pass type configuration for auto-approval (e.g. EMERGENCY)
    const configuredType = await db.get('SELECT * FROM pass_types WHERE code = $1', [pass_type]);
    const requiresApproval = configuredType ? configuredType.requires_approval === true : true;
    const initialStatus = requiresApproval ? 'PENDING' : 'APPROVED';

    await db.query(`
      INSERT INTO digital_passes (
        id, pass_number, user_id, pass_type, reason, destination,
        valid_from, valid_to, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
    `, [
      passId,
      passNumber,
      userId,
      pass_type,
      reason.trim(),
      destination.trim(),
      fromDate.toISOString(),
      toDate.toISOString(),
      initialStatus
    ]);

    let qrInfo = null;
    if (initialStatus === 'APPROVED') {
      const p = await db.get('SELECT * FROM digital_passes WHERE id = $1', [passId]);
      qrInfo = await generatePassQR(p);
    }

    await logAudit({
      actorId: userId,
      action: 'PASS_REQUEST_CREATED',
      entityType: 'PASS',
      entityId: passId,
      details: { passNumber, pass_type, destination, status: initialStatus },
      ipAddress: req.ip
    });

    // Notify faculty mentors if pending approval
    if (initialStatus === 'PENDING') {
      const mentors = await db.all("SELECT id FROM users WHERE role = 'FACULTY' LIMIT 5");
      for (const m of mentors) {
        await createNotification({
          userId: m.id,
          title: 'New Pass Request Awaiting Review',
          message: `${req.user.name} submitted a ${pass_type.replace('_', ' ')} request for "${destination.trim()}".`,
          type: 'PASS_PENDING',
          link: '/'
        });
      }
    }

    const newPass = await db.get('SELECT * FROM digital_passes WHERE id = $1', [passId]);

    res.status(201).json({
      message: initialStatus === 'APPROVED' ? 'Pass generated and pre-approved.' : 'Pass request submitted successfully. Awaiting approval.',
      pass: newPass,
      qr: qrInfo
    });
  } catch (err) {
    console.error('RequestPass error:', err);
    res.status(500).json({ error: 'Internal server error creating pass request.' });
  }
}

async function getPasses(req, res) {
  try {
    const { status, search, pass_type } = req.query;
    let query = `
      SELECT p.*, u.name as student_name, u.reg_no, u.department, u.email as student_email,
             approver.name as approver_name
      FROM digital_passes p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN users approver ON p.approved_by = approver.id
      WHERE 1=1
    `;
    const params = [];

    // Role-based visibility scoping
    if (req.user.role === 'STUDENT' || req.user.role === 'VISITOR') {
      params.push(req.user.id);
      query += ` AND p.user_id = $${params.length}`;
    }

    if (status && status !== 'ALL') {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }

    if (pass_type && pass_type !== 'ALL') {
      params.push(pass_type);
      query += ` AND p.pass_type = $${params.length}`;
    }

    if (search) {
      const s = `%${search}%`;
      params.push(s, s, s, s);
      const l = params.length;
      query += ` AND (p.pass_number ILIKE $${l-3} OR u.name ILIKE $${l-2} OR u.reg_no ILIKE $${l-1} OR p.destination ILIKE $${l})`;
    }

    query += ` ORDER BY p.created_at DESC`;

    const passes = await db.all(query, params);
    res.json({ passes });
  } catch (err) {
    console.error('GetPasses error:', err);
    res.status(500).json({ error: 'Internal server error fetching passes.' });
  }
}

async function getPassById(req, res) {
  try {
    const { id } = req.params;

    const pass = await db.get(`
      SELECT p.*, u.name as student_name, u.reg_no, u.department, u.phone, u.email,
             approver.name as approver_name
      FROM digital_passes p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN users approver ON p.approved_by = approver.id
      WHERE p.id = $1
    `, [id]);

    if (!pass) {
      return res.status(404).json({ error: 'Pass not found.' });
    }

    // Role security check
    if (req.user.role === 'STUDENT' && pass.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You can only view your own passes.' });
    }

    let qrInfo = null;
    if (pass.status === 'APPROVED') {
      qrInfo = await generatePassQR(pass);
    }

    res.json({
      pass,
      qr: qrInfo
    });
  } catch (err) {
    console.error('GetPassById error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function approvePass(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const approverId = req.user.id;

    const pass = await db.get(`
      SELECT p.*, u.name as student_name, u.email as student_email
      FROM digital_passes p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [id]);

    if (!pass) {
      return res.status(404).json({ error: 'Pass not found.' });
    }

    if (pass.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot approve pass with status: ${pass.status}` });
    }

    await db.query(`
      UPDATE digital_passes
      SET status = 'APPROVED',
          approved_by = $1,
          approval_notes = $2,
          approval_time = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [approverId, notes || `Approved by ${req.user.name}`, id]);

    const updatedPass = await db.get('SELECT * FROM digital_passes WHERE id = $1', [id]);
    const qrInfo = await generatePassQR(updatedPass);

    // Notify Student
    await createNotification({
      userId: pass.user_id,
      title: 'Digital Pass Approved',
      message: `Your pass request (${pass.pass_number}) to ${pass.destination} has been approved. QR Code is active!`,
      type: 'PASS_APPROVED',
      link: '/'
    });

    sendEmail({
      to: pass.student_email,
      template: 'PASS_APPROVAL',
      data: {
        studentName: pass.student_name,
        passNumber: pass.pass_number,
        destination: pass.destination
      }
    });

    await logAudit({
      actorId: approverId,
      action: 'PASS_APPROVED',
      entityType: 'PASS',
      entityId: id,
      details: { passNumber: pass.pass_number, notes },
      ipAddress: req.ip
    });

    res.json({
      message: 'Pass approved successfully. QR verification token generated.',
      pass: updatedPass,
      qr: qrInfo
    });
  } catch (err) {
    console.error('ApprovePass error:', err);
    res.status(500).json({ error: 'Internal server error approving pass.' });
  }
}

async function rejectPass(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const approverId = req.user.id;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required.' });
    }

    const pass = await db.get(`
      SELECT p.*, u.name as student_name, u.email as student_email
      FROM digital_passes p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [id]);

    if (!pass) {
      return res.status(404).json({ error: 'Pass not found.' });
    }

    await db.query(`
      UPDATE digital_passes
      SET status = 'REJECTED',
          approved_by = $1,
          approval_notes = $2,
          rejection_reason = $3,
          approval_time = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [approverId, reason.trim(), reason.trim(), id]);

    // Deactivate QR tokens if any existed
    await db.query('UPDATE qr_tokens SET is_active = false WHERE pass_id = $1', [id]);

    // Notify Student
    await createNotification({
      userId: pass.user_id,
      title: 'Digital Pass Declined',
      message: `Your pass request (${pass.pass_number}) was declined. Reason: ${reason.trim()}`,
      type: 'PASS_REJECTED',
      link: '/'
    });

    sendEmail({
      to: pass.student_email,
      template: 'PASS_REJECTION',
      data: {
        studentName: pass.student_name,
        passNumber: pass.pass_number,
        reason: reason.trim()
      }
    });

    await logAudit({
      actorId: approverId,
      action: 'PASS_REJECTED',
      entityType: 'PASS',
      entityId: id,
      details: { passNumber: pass.pass_number, reason: reason.trim() },
      ipAddress: req.ip
    });

    res.json({ message: 'Pass rejected successfully.', passId: id });
  } catch (err) {
    console.error('RejectPass error:', err);
    res.status(500).json({ error: 'Internal server error rejecting pass.' });
  }
}

async function cancelPass(req, res) {
  try {
    const { id } = req.params;
    const pass = await db.get('SELECT * FROM digital_passes WHERE id = $1', [id]);

    if (!pass) {
      return res.status(404).json({ error: 'Pass not found.' });
    }

    if (pass.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You are only allowed to cancel your own passes.' });
    }

    if (pass.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending passes can be cancelled.' });
    }

    await db.query(`UPDATE digital_passes SET status = 'CANCELLED' WHERE id = $1`, [id]);

    await logAudit({
      actorId: req.user.id,
      action: 'PASS_CANCELLED',
      entityType: 'PASS',
      entityId: id,
      details: { passNumber: pass.pass_number },
      ipAddress: req.ip
    });

    res.json({ message: 'Pass cancelled successfully.', passId: id });
  } catch (err) {
    console.error('CancelPass error:', err);
    res.status(500).json({ error: 'Internal server error cancelling pass.' });
  }
}

async function revokePass(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const pass = await db.get('SELECT * FROM digital_passes WHERE id = $1', [id]);
    if (!pass) {
      return res.status(404).json({ error: 'Pass not found.' });
    }

    await db.query(`
      UPDATE digital_passes
      SET status = 'REVOKED',
          approval_notes = $1
      WHERE id = $2
    `, [reason || 'Pass revoked by security/administration', id]);

    // Invalidate QR tokens
    await db.query('UPDATE qr_tokens SET is_active = false WHERE pass_id = $1', [id]);

    await createNotification({
      userId: pass.user_id,
      title: 'Pass Revoked',
      message: `Your campus pass (${pass.pass_number}) was revoked by campus security authority. Reason: ${reason || 'Security directive'}`,
      type: 'PASS_REVOKED',
      link: '/'
    });

    await logAudit({
      actorId: req.user.id,
      action: 'PASS_REVOKED',
      entityType: 'PASS',
      entityId: id,
      details: { passNumber: pass.pass_number, reason },
      ipAddress: req.ip
    });

    res.json({ message: 'Pass revoked and QR token invalidated.', passId: id });
  } catch (err) {
    console.error('RevokePass error:', err);
    res.status(500).json({ error: 'Internal server error revoking pass.' });
  }
}

module.exports = {
  requestPass,
  getPasses,
  getPassById,
  approvePass,
  rejectPass,
  cancelPass,
  revokePass
};
