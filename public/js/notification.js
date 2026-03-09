// Notification Logic
async function loadNotifications() {
    const res = await fetch('/api/notification');
    const notifications = await res.json();
    const list = document.getElementById('notifList');
    list.innerHTML = '';

    if (notifications.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No notifications yet</p>';
        return;
    }

    notifications.forEach(notif => {
        const item = document.createElement('div');
        item.className = 'notification-item';
        
        let actions = '';
        if (notif.type === 'friend_request' && notif.status === 'pending') {
            actions = `
                <div class="notif-actions">
                    <button class="btn-accept" onclick="respondRequest('${notif._id}', 'accepted')">Accept</button>
                    <button class="btn-reject" onclick="respondRequest('${notif._id}', 'rejected')">Reject</button>
                </div>
            `;
        } else if (notif.status !== 'pending') {
            actions = `<span style="color: var(--text-secondary); font-size: 0.8rem;">${notif.status}</span>`;
        }

        item.innerHTML = `
            <div class="notif-content">
                <img src="${notif.senderId.profilePicture}" class="avatar">
                <div>
                    <strong>${notif.senderId.name}</strong>
                    <p style="font-size: 0.9rem; color: var(--text-secondary);">${notif.message}</p>
                </div>
            </div>
            ${actions}
        `;
        list.appendChild(item);
    });

    // Mark all as read
    await fetch('/api/notification/markRead', { method: 'POST' });
}

async function respondRequest(notifId, status) {
    // We need the requestId from the notification or find it
    // For simplicity, let's assume the notification ID can be used to find the request 
    // or we fetch the request associated with the sender.
    // In a real app, you'd store the friendRequestId in the notification.
    
    // Let's find the friend request ID first
    const resNotif = await fetch('/api/notification');
    const allNotifs = await resNotif.json();
    const targetNotif = allNotifs.find(n => n._id === notifId);
    
    // Now find the friend request
    const resFriends = await fetch('/api/friend/friends'); // This only returns accepted.
    // We need a route to get pending requests. Let's add it or use a better approach.
    // For this demo, I'll just use a generic respond route that takes senderId.
    
    // Actually, let's just use the senderId from the notification to find the request on the backend.
    // I'll update the backend route to handle this.
    
    const res = await fetch('/api/friend/respondRequest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: targetNotif.senderId._id, status })
    });
    
    if (res.ok) {
        loadNotifications();
    }
}

// I need to fix the respondRequest backend route to be more robust.
// Let's update friend.ts to handle senderId instead of requestId if needed.

loadNotifications();
