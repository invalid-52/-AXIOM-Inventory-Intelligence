/**
 * AXIOM INVENTORY INTELLIGENCE - NOTIFICATION CENTER VIEW
 * Manages in-app notifications, badge counter, and alerts drawer.
 */

window.AxiomNotification = (function() {
  'use strict';

  let notifications = [];
  let unreadCount = 0;
  let isOpen = false;

  /**
   * Initialize notification center
   */
  function initNotifications() {
    loadNotifications();
    // Periodic refresh
    setInterval(loadNotifications, 25000);
  }

  /**
   * Fetch notifications from backend
   */
  async function loadNotifications() {
    try {
      const resp = await fetch('/api/notifications');
      const data = await resp.json();
      if (data.success && Array.isArray(data.notifications)) {
        notifications = data.notifications;
        unreadCount = data.unreadCount || notifications.filter(n => !n.read).length;
        updateBadge();
        if (isOpen) renderDrawerContent();
      }
    } catch (err) {
      console.warn('[NotificationCenter] Could not load notifications:', err.message);
    }
  }

  /**
   * Update topbar badge
   */
  function updateBadge() {
    const badgeEl = document.getElementById('tbNotifBadge');
    if (!badgeEl) return;

    if (unreadCount > 0) {
      badgeEl.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badgeEl.style.display = 'inline-flex';
    } else {
      badgeEl.style.display = 'none';
    }
  }

  /**
   * Toggle Notification Drawer
   */
  function toggleDrawer() {
    isOpen = !isOpen;
    let drawer = document.getElementById('notifDrawer');
    let backdrop = document.getElementById('notifDrawerBackdrop');

    if (!drawer) {
      // Create elements
      backdrop = document.createElement('div');
      backdrop.id = 'notifDrawerBackdrop';
      backdrop.className = 'drawer-backdrop';
      backdrop.onclick = toggleDrawer;
      document.body.appendChild(backdrop);

      drawer = document.createElement('aside');
      drawer.id = 'notifDrawer';
      drawer.className = 'drawer notif-drawer';
      document.body.appendChild(drawer);
    }

    if (isOpen) {
      renderDrawerContent();
      drawer.classList.add('open');
      backdrop.classList.add('open');
    } else {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
    }
  }

  /**
   * Render Drawer Contents
   */
  function renderDrawerContent() {
    const drawer = document.getElementById('notifDrawer');
    if (!drawer) return;

    drawer.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-title" style="display:flex;align-items:center;gap:8px;">
          <span>🔔</span> Notifications & Operational Alerts
          ${unreadCount > 0 ? `<span class="chip crit">${unreadCount} NEW</span>` : ''}
        </div>
        <button class="drawer-close" onclick="AxiomNotification.toggleDrawer()">&times;</button>
      </div>

      <div class="notif-actions-bar">
        <button class="btn btn-outline btn-sm" onclick="AxiomNotification.markAllAsRead()">Mark All Read</button>
        <button class="btn btn-outline btn-sm btn-danger" onclick="AxiomNotification.clearAll()">Clear All</button>
      </div>

      <div class="notif-list-body">
        ${notifications.length === 0 ? `
          <div style="text-align:center;padding:3rem;color:var(--text2);">
            <div style="font-size:2rem;margin-bottom:0.5rem;">✨</div>
            No notifications at this time. All systems operational.
          </div>
        ` : notifications.map(n => {
          const isCrit = n.severity === 'CRITICAL';
          const isWarn = n.severity === 'WARNING';
          const dateStr = new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return `
            <div class="notif-item ${n.read ? 'read' : 'unread'} ${isCrit ? 'crit-alert' : ''}" onclick="AxiomNotification.handleNotifClick('${n.id}', '${n.actionLink || ''}')">
              <div class="notif-item-top">
                <div class="notif-severity-dot ${isCrit ? 'crit' : (isWarn ? 'warn' : 'info')}"></div>
                <span class="notif-item-title">${n.title}</span>
                <span class="notif-item-time mono">${dateStr}</span>
              </div>
              <div class="notif-item-msg">${n.message}</div>
              ${n.actionLink ? `<div class="notif-item-link">Action: Click to review details ›</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Click notification item
   */
  async function handleNotifClick(id, link) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      const notif = notifications.find(n => n.id === id);
      if (notif) notif.read = true;
      unreadCount = notifications.filter(n => !n.read).length;
      updateBadge();
    } catch (e) {}

    if (link) {
      toggleDrawer();
      const secName = link.replace('#sec-', '');
      if (window.AxiomNavigation) {
        window.AxiomNavigation.switchSection(secName);
      }
    } else {
      renderDrawerContent();
    }
  }

  /**
   * Mark all as read
   */
  async function markAllAsRead() {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      notifications.forEach(n => { n.read = true; });
      unreadCount = 0;
      updateBadge();
      renderDrawerContent();
    } catch (e) {}
  }

  /**
   * Clear all
   */
  async function clearAll() {
    try {
      await fetch('/api/notifications/clear', { method: 'POST' });
      notifications = [];
      unreadCount = 0;
      updateBadge();
      renderDrawerContent();
    } catch (e) {}
  }

  return {
    initNotifications,
    loadNotifications,
    toggleDrawer,
    handleNotifClick,
    markAllAsRead,
    clearAll
  };
})();
