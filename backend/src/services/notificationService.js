const { v4: uuidv4 } = require('uuid');
const db = require('../db');

async function createNotification({ userId, title, message, type = 'INFO', link = null }) {
  try {
    const id = `notif-${uuidv4().slice(0, 8)}`;
    await db.query(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
      VALUES ($1, $2, $3, $4, $5, false, $6, CURRENT_TIMESTAMP)
    `, [id, userId, title, message, type, link]);
    return { id, userId, title, message, type, link };
  } catch (err) {
    console.error('Failed to create in-app notification:', err.message);
    return null;
  }
}

async function getUserNotifications(userId) {
  try {
    return await db.all(`
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId]);
  } catch (err) {
    console.error('Failed to fetch notifications:', err.message);
    return [];
  }
}

async function markAsRead(notificationId, userId) {
  try {
    await db.query(`
      UPDATE notifications
      SET is_read = true
      WHERE id = $1 AND user_id = $2
    `, [notificationId, userId]);
    return true;
  } catch (err) {
    console.error('Failed to mark notification as read:', err.message);
    return false;
  }
}

async function markAllAsRead(userId) {
  try {
    await db.query(`
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1
    `, [userId]);
    return true;
  } catch (err) {
    console.error('Failed to mark all notifications as read:', err.message);
    return false;
  }
}

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead
};
