const { v4: uuidv4 } = require('uuid');
const db = require('../db');

async function logAudit({ actorId, action, entityType, entityId, details, ipAddress }) {
  try {
    await db.query(`
      INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      `aud-${uuidv4().slice(0, 8)}`,
      actorId || null,
      action,
      entityType,
      entityId || null,
      typeof details === 'object' ? JSON.stringify(details) : details || null,
      ipAddress || null
    ]);
  } catch (err) {
    console.error('Failed to log audit event:', err.message);
  }
}

module.exports = {
  logAudit
};
