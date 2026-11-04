const { getUserNotifications, markAsRead, markAllAsRead } = require('../services/notificationService');

async function getMyNotifications(req, res) {
  try {
    const list = await getUserNotifications(req.user.id);
    const unreadCount = list.filter(n => !n.is_read).length;
    res.json({ notifications: list, unreadCount });
  } catch (err) {
    console.error('GetNotifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
}

async function readNotification(req, res) {
  try {
    const { id } = req.params;
    await markAsRead(id, req.user.id);
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('ReadNotification error:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
}

async function readAll(req, res) {
  try {
    await markAllAsRead(req.user.id);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('ReadAll error:', err);
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
}

module.exports = {
  getMyNotifications,
  readNotification,
  readAll
};
