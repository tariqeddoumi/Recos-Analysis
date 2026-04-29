'use strict';

const notificationService = require('../services/notification.service');
const logger = require('../config/logger');

// ----------------------------------------------------------------
// GET /api/notifications
// ----------------------------------------------------------------
async function getNotifications(req, res) {
  try {
    const { page = 1, limit = 20, unread_only = 'false' } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const result = notificationService.getUserNotifications(req.user.id, {
      page: pageNum,
      limit: limitNum,
      unreadOnly: unread_only === 'true'
    });

    return res.json(result);
  } catch (err) {
    logger.error('getNotifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
}

// ----------------------------------------------------------------
// PUT /api/notifications/:id/read
// ----------------------------------------------------------------
async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    const success = notificationService.markAsRead(parseInt(id), req.user.id);

    if (!success) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    logger.error('markNotificationRead error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark notification.' });
  }
}

// ----------------------------------------------------------------
// PUT /api/notifications/read-all
// ----------------------------------------------------------------
async function markAllNotificationsRead(req, res) {
  try {
    const count = notificationService.markAllAsRead(req.user.id);
    return res.json({ success: true, data: { marked: count }, message: `${count} notifications marked as read.` });
  } catch (err) {
    logger.error('markAllNotificationsRead error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark notifications.' });
  }
}

// ----------------------------------------------------------------
// GET /api/notifications/count
// ----------------------------------------------------------------
async function getNotificationCount(req, res) {
  try {
    const count = notificationService.getUnreadCount(req.user.id);
    return res.json({ success: true, data: { unread: count } });
  } catch (err) {
    logger.error('getNotificationCount error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get count.' });
  }
}

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationCount
};
