/**
 * AXIOM INVENTORY INTELLIGENCE - NOTIFICATION SERVICE
 * Manages in-app notifications, operational alerts, and audit logs with atomic persistence.
 */

const path = require('path');
const crypto = require('crypto');
const storage = require('./storageService');

const NOTIFS_FILE = path.join(__dirname, '..', '..', 'storage', 'notifications.json');

// Default initial notifications if file doesn't exist
const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'Tokyo Forward Demand Surge',
    message: 'Booking velocity accelerated by +30% YoY (182 rooms/day). Immediate inventory procurement recommended.',
    severity: 'WARNING',
    category: 'DEMAND',
    read: false,
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    actionLink: '#sec-optimizer'
  },
  {
    id: 'notif-2',
    title: 'Grand Hyatt Tokyo Stockout Risk',
    message: 'Committed allotment (120 units) falls short of 30-day forecast (360 units) by 240 units.',
    severity: 'CRITICAL',
    category: 'INVENTORY',
    read: false,
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    actionLink: '#sec-optimizer'
  },
  {
    id: 'notif-3',
    title: 'Daily Executive Digest Generated',
    message: 'Automated 08:00 AM briefing generated in PDF and XLSX formats.',
    severity: 'INFO',
    category: 'REPORT',
    read: true,
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    actionLink: '#sec-documents'
  },
  {
    id: 'notif-4',
    title: 'Wholesaler SLA Notice: WebBeds',
    message: 'Confirmed fulfillment dipped to 94.2% on Maldives contracts. Reallocation recommended.',
    severity: 'WARNING',
    category: 'SUPPLIER',
    read: false,
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    actionLink: '#sec-supplier'
  }
];

function initNotifications() {
  const existing = storage.readJSONSync(NOTIFS_FILE, null);
  if (!existing || !Array.isArray(existing) || existing.length === 0) {
    storage.writeJSONSync(NOTIFS_FILE, INITIAL_NOTIFICATIONS);
  }
}
initNotifications();

function readNotifications() {
  return storage.readJSONSync(NOTIFS_FILE, INITIAL_NOTIFICATIONS) || [];
}

function writeNotifications(notifs) {
  storage.writeJSONSync(NOTIFS_FILE, notifs);
}

function listNotifications() {
  return readNotifications();
}

function addNotification({ title, message, severity = 'INFO', category = 'SYSTEM', actionLink = null, metadata = {} }) {
  const notifs = readNotifications();
  const newNotif = {
    id: `notif-${crypto.randomUUID()}`,
    title,
    message,
    severity,
    category,
    read: false,
    timestamp: new Date().toISOString(),
    actionLink,
    metadata
  };

  notifs.unshift(newNotif);
  if (notifs.length > 100) notifs.pop(); // Keep last 100
  writeNotifications(notifs);
  return newNotif;
}

function markAsRead(id) {
  const notifs = readNotifications();
  const notif = notifs.find(n => n.id === id);
  if (notif) {
    notif.read = true;
    writeNotifications(notifs);
  }
  return notif;
}

function markAllAsRead() {
  const notifs = readNotifications();
  notifs.forEach(n => { n.read = true; });
  writeNotifications(notifs);
  return notifs;
}

function clearAll() {
  writeNotifications([]);
  return [];
}

module.exports = {
  listNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
  clearAll
};
