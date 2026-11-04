const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { logAudit } = require('../services/auditService');

// --- Gates Management ---
async function getGates(req, res) {
  try {
    const gates = await db.all('SELECT * FROM campus_gates ORDER BY gate_number ASC');
    res.json({ gates });
  } catch (err) {
    console.error('GetGates error:', err);
    res.status(500).json({ error: 'Failed to fetch campus gates.' });
  }
}

async function createGate(req, res) {
  try {
    const { gate_name, gate_number, location, description } = req.body;
    if (!gate_name || !gate_number || !location) {
      return res.status(400).json({ error: 'Gate name, number, and location are required.' });
    }

    const id = `gate-${uuidv4().slice(0, 8)}`;
    await db.query(`
      INSERT INTO campus_gates (id, gate_name, gate_number, location, description, status)
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
    `, [id, gate_name.trim(), gate_number.trim(), location.trim(), description || '']);

    await logAudit({
      actorId: req.user.id,
      action: 'GATE_CREATED',
      entityType: 'GATE',
      entityId: id,
      details: { gate_name, gate_number },
      ipAddress: req.ip
    });

    const newGate = await db.get('SELECT * FROM campus_gates WHERE id = $1', [id]);
    res.status(201).json({ message: 'Gate created successfully', gate: newGate });
  } catch (err) {
    console.error('CreateGate error:', err);
    res.status(500).json({ error: 'Failed to create campus gate.' });
  }
}

async function updateGate(req, res) {
  try {
    const { id } = req.params;
    const { gate_name, gate_number, location, description, status } = req.body;

    await db.query(`
      UPDATE campus_gates
      SET gate_name = COALESCE($1, gate_name),
          gate_number = COALESCE($2, gate_number),
          location = COALESCE($3, location),
          description = COALESCE($4, description),
          status = COALESCE($5, status)
      WHERE id = $6
    `, [gate_name, gate_number, location, description, status, id]);

    await logAudit({
      actorId: req.user.id,
      action: 'GATE_UPDATED',
      entityType: 'GATE',
      entityId: id,
      details: { gate_name, status },
      ipAddress: req.ip
    });

    const updated = await db.get('SELECT * FROM campus_gates WHERE id = $1', [id]);
    res.json({ message: 'Gate updated successfully', gate: updated });
  } catch (err) {
    console.error('UpdateGate error:', err);
    res.status(500).json({ error: 'Failed to update campus gate.' });
  }
}

async function deleteGate(req, res) {
  try {
    const { id } = req.params;
    await db.query("UPDATE campus_gates SET status = 'INACTIVE' WHERE id = $1", [id]);

    await logAudit({
      actorId: req.user.id,
      action: 'GATE_DEACTIVATED',
      entityType: 'GATE',
      entityId: id,
      details: 'Gate deactivated by administrator',
      ipAddress: req.ip
    });

    res.json({ message: 'Gate deactivated successfully' });
  } catch (err) {
    console.error('DeleteGate error:', err);
    res.status(500).json({ error: 'Failed to deactivate gate.' });
  }
}

// --- Pass Types Management ---
async function getPassTypes(req, res) {
  try {
    const types = await db.all('SELECT * FROM pass_types ORDER BY name ASC');
    res.json({ passTypes: types });
  } catch (err) {
    console.error('GetPassTypes error:', err);
    res.status(500).json({ error: 'Failed to fetch pass types.' });
  }
}

async function createPassType(req, res) {
  try {
    const { code, name, description, max_duration_hours, requires_approval } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Pass type code and name are required.' });
    }

    const id = `pt-${uuidv4().slice(0, 8)}`;
    await db.query(`
      INSERT INTO pass_types (id, code, name, description, max_duration_hours, requires_approval, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
    `, [id, code.trim().toUpperCase(), name.trim(), description || '', max_duration_hours || 24, !!requires_approval]);

    const newType = await db.get('SELECT * FROM pass_types WHERE id = $1', [id]);
    res.status(201).json({ message: 'Pass type created successfully', passType: newType });
  } catch (err) {
    console.error('CreatePassType error:', err);
    res.status(500).json({ error: 'Failed to create pass type.' });
  }
}

// --- Currently Inside Campus Tracker ---
async function getCurrentlyInside(req, res) {
  try {
    const people = await db.all(`
      SELECT ci.*, u.name as person_name, u.reg_no, u.role, u.department, u.phone,
             p.pass_number, p.pass_type, p.destination, p.valid_to
      FROM currently_inside ci
      JOIN users u ON ci.person_id = u.id
      JOIN digital_passes p ON ci.pass_id = p.id
      ORDER BY ci.entry_time DESC
    `);

    res.json({ currentlyInside: people, count: people.length });
  } catch (err) {
    console.error('GetCurrentlyInside error:', err);
    res.status(500).json({ error: 'Failed to fetch currently inside records.' });
  }
}

// --- Real Database Stats for Role Dashboards ---
async function getDashboardStats(req, res) {
  try {
    const totalUsersRes = await db.get('SELECT COUNT(*) as count FROM users');
    const studentsRes = await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'STUDENT'");
    const facultyRes = await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'FACULTY'");
    const visitorsRes = await db.get("SELECT COUNT(*) as count FROM visitors");

    const activePassesRes = await db.get("SELECT COUNT(*) as count FROM digital_passes WHERE status = 'APPROVED'");
    const pendingPassesRes = await db.get("SELECT COUNT(*) as count FROM digital_passes WHERE status = 'PENDING'");
    const expiredPassesRes = await db.get("SELECT COUNT(*) as count FROM digital_passes WHERE status = 'EXPIRED' OR valid_to < CURRENT_TIMESTAMP");

    const todayEntriesRes = await db.get(`
      SELECT COUNT(*) as count FROM gate_scans 
      WHERE action_type = 'ENTRY' AND result = 'GRANTED' AND DATE(scanned_at) = CURRENT_DATE
    `);

    const todayExitsRes = await db.get(`
      SELECT COUNT(*) as count FROM gate_scans 
      WHERE action_type = 'EXIT' AND result = 'GRANTED' AND DATE(scanned_at) = CURRENT_DATE
    `);

    const currentlyInsideRes = await db.get('SELECT COUNT(*) as count FROM currently_inside');

    res.json({
      totalUsers: parseInt(totalUsersRes.count, 10),
      students: parseInt(studentsRes.count, 10),
      faculty: parseInt(facultyRes.count, 10),
      visitors: parseInt(visitorsRes.count, 10),
      activePasses: parseInt(activePassesRes.count, 10),
      pendingPasses: parseInt(pendingPassesRes.count, 10),
      expiredPasses: parseInt(expiredPassesRes.count, 10),
      todayEntries: parseInt(todayEntriesRes.count, 10),
      todayExits: parseInt(todayExitsRes.count, 10),
      currentlyInsideCount: parseInt(currentlyInsideRes.count, 10)
    });
  } catch (err) {
    console.error('GetDashboardStats error:', err);
    res.status(500).json({ error: 'Failed to calculate dashboard statistics.' });
  }
}

module.exports = {
  getGates,
  createGate,
  updateGate,
  deleteGate,
  getPassTypes,
  createPassType,
  getCurrentlyInside,
  getDashboardStats
};
