const admin = require('firebase-admin');

class PushService {
  constructor() {
    this.messaging = null;
    this.initialize();
  }

  initialize() {
    try {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (serviceAccountKey) {
        const serviceAccount = JSON.parse(serviceAccountKey);

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });

        this.messaging = admin.messaging();
        console.log('Push notification service initialized successfully');
      } else {
        console.warn('Push notification service not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY in environment variables.');
      }
    } catch (error) {
      console.error('Failed to initialize push notification service:', error);
    }
  }

  async sendPushNotification({ tokens, title, body, data }) {
    try {
      if (!this.messaging) {
        throw new Error('Push notification service not configured');
      }

      if (!Array.isArray(tokens)) {
        tokens = [tokens];
      }

      const message = {
        notification: {
          title,
          body
        },
        data: data || {},
        tokens
      };

      const response = await this.messaging.sendMulticast(message);

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses
      };
    } catch (error) {
      console.error('Push notification sending error:', error);
      throw error;
    }
  }

  async sendOrderUpdate({ tokens, orderNumber, status }) {
    return this.sendPushNotification({
      tokens,
      title: 'Order Update',
      body: `Your order #${orderNumber} is now ${status}`,
      data: {
        type: 'order_update',
        orderNumber,
        status
      }
    });
  }

  async sendNewMessage({ tokens, senderName, message }) {
    return this.sendPushNotification({
      tokens,
      title: `New message from ${senderName}`,
      body: message,
      data: {
        type: 'new_message',
        senderName
      }
    });
  }

  async sendPromotionalNotification({ tokens, title, body, promoId }) {
    return this.sendPushNotification({
      tokens,
      title,
      body,
      data: {
        type: 'promotion',
        promoId
      }
    });
  }

  async sendInventoryAlert({ tokens, productName, status }) {
    return this.sendPushNotification({
      tokens,
      title: 'Inventory Alert',
      body: `${productName} is ${status}`,
      data: {
        type: 'inventory_alert',
        productName,
        status
      }
    });
  }
}

module.exports = new PushService();
