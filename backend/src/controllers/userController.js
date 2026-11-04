const db = require('../db');
const { logAudit } = require('../services/auditService');

async function getProfile(req, res) {
  try {
    const user = await db.get(`
      SELECT id, reg_no, name, email, role, department, course, year, section, phone, emergency_contact, status, created_at
      FROM users WHERE id = $1
    `, [req.user.id]);
    res.json({ user });
  } catch (err) {
    console.error('GetProfile error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
}

async function updateProfile(req, res) {
  try {
    const { name, phone, emergency_contact, course, year, section } = req.body;
    const userId = req.user.id;

    await db.query(`
      UPDATE users
      SET name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          emergency_contact = COALESCE($3, emergency_contact),
          course = COALESCE($4, course),
          year = COALESCE($5, year),
          section = COALESCE($6, section)
      WHERE id = $7
    `, [name, phone, emergency_contact, course, year, section, userId]);

    const updatedUser = await db.get(`
      SELECT id, reg_no, name, email, role, department, course, year, section, phone, emergency_contact, status
      FROM users WHERE id = $1
    `, [userId]);

    await logAudit({
      actorId: userId,
      action: 'PROFILE_UPDATED',
      entityType: 'USER',
      entityId: userId,
      details: 'User updated personal profile details',
      ipAddress: req.ip
    });

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    console.error('UpdateProfile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
}

async function listUsers(req, res) {
  try {
    const { role, department, status, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT id, reg_no, name, email, role, department, course, year, section, phone, emergency_contact, status, created_at
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (role && role !== 'ALL') {
      params.push(role);
      query += ` AND role = $${params.length}`;
    }

    if (department && department !== 'ALL') {
      params.push(department);
      query += ` AND department = $${params.length}`;
    }

    if (status && status !== 'ALL') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (search) {
      const s = `%${search}%`;
      params.push(s, s, s, s);
      const l = params.length;
      query += ` AND (name ILIKE $${l-3} OR reg_no ILIKE $${l-2} OR email ILIKE $${l-1} OR department ILIKE $${l})`;
    }

    params.push(Number(limit), Number(offset));
    query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const users = await db.all(query, params);
    const totalRes = await db.get('SELECT COUNT(*) as count FROM users');
    const total = parseInt(totalRes.count, 10);

    res.json({ users, total });
  } catch (err) {
    console.error('ListUsers error:', err);
    res.status(500).json({ error: 'Failed to list users.' });
  }
}

async function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ error: 'Status must be ACTIVE or INACTIVE.' });
    }

    await db.query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);

    await logAudit({
      actorId: req.user.id,
      action: `USER_STATUS_${status}`,
      entityType: 'USER',
      entityId: id,
      details: { newStatus: status },
      ipAddress: req.ip
    });

    res.json({ message: `User status updated to ${status}` });
  } catch (err) {
    console.error('UpdateUserStatus error:', err);
    res.status(500).json({ error: 'Failed to update user status.' });
  }
}

async function getDepartments(req, res) {
  try {
    const departments = await db.all('SELECT * FROM departments ORDER BY name ASC');
    res.json({ departments });
  } catch (err) {
    console.error('GetDepartments error:', err);
    res.status(500).json({ error: 'Failed to fetch departments.' });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  listUsers,
  updateUserStatus,
  getDepartments
};
