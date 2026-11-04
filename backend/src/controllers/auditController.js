const db = require('../db');

async function getAuditLogs(req, res) {
  try {
    const { action, entity_type, search, limit = 100 } = req.query;

    let query = `
      SELECT a.*, u.name as actor_name, u.email as actor_email, u.role as actor_role
      FROM audit_logs a
      LEFT JOIN users u ON a.actor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (action && action !== 'ALL') {
      params.push(action);
      query += ` AND a.action = $${params.length}`;
    }

    if (entity_type && entity_type !== 'ALL') {
      params.push(entity_type);
      query += ` AND a.entity_type = $${params.length}`;
    }

    if (search) {
      const s = `%${search}%`;
      params.push(s, s, s, s);
      const l = params.length;
      query += ` AND (a.action ILIKE $${l-3} OR a.details ILIKE $${l-2} OR u.name ILIKE $${l-1} OR a.entity_id ILIKE $${l})`;
    }

    params.push(Number(limit));
    query += ` ORDER BY a.created_at DESC LIMIT $${params.length}`;

    const logs = await db.all(query, params);

    res.json({ logs });
  } catch (err) {
    console.error('GetAuditLogs error:', err);
    res.status(500).json({ error: 'Internal server error fetching audit logs.' });
  }
}

module.exports = {
  getAuditLogs
};
