class PushService {
  constructor() {
    this.subscribers = [];
  }

  // Subscribe a new user to push notifications
  subscribe(user) {
    if (!this.subscribers.includes(user)) {
      this.subscribers.push(user);
      console.log(`User subscribed: ${user}`);
    } else {
      console.log(`User ${user} is already subscribed.`);
    }
  }

  // Unsubscribe a user from push notifications
  unsubscribe(user) {
    this.subscribers = this.subscribers.filter(subscriber => subscriber !== user);
    console.log(`User unsubscribed: ${user}`);
  }

  // Trigger local notification for all subscribers
  sendLocalNotification(message) {
    this.subscribers.forEach(subscriber => {
      console.log(`Sending local notification to ${subscriber}: ${message}`);
      // Here you would integrate with a local notification system
    });
  }
}

// Example usage:
const pushService = new PushService();
pushService.subscribe('user1');
pushService.sendLocalNotification('Hello World!');
