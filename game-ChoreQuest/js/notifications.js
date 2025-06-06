// Notification System

function showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Chore Quest', {
            body: message,
            icon: '⚔️'
        });
    }
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function initializeNotifications() {
    requestNotificationPermission();
    
    // Demo notifications
    setTimeout(() => {
        showNotification('新しいデイリークエストが利用可能です！');
    }, 10000);
} 