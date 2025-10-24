const twilio = require('twilio');

class SMSService {
  constructor() {
    this.client = null;
    this.phoneNumber = null;
    this.initialize();
  }

  initialize() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;

      if (accountSid && authToken && this.phoneNumber) {
        this.client = twilio(accountSid, authToken);
        console.log('SMS service initialized successfully');
      } else {
        console.warn('SMS service not configured. Set TWILIO credentials in environment variables.');
      }
    } catch (error) {
      console.error('Failed to initialize SMS service:', error);
    }
  }

  async sendSMS({ to, message }) {
    try {
      if (!this.client) {
        throw new Error('SMS service not configured');
      }

      const result = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to
      });

      return {
        success: true,
        messageId: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('SMS sending error:', error);
      throw error;
    }
  }

  async sendVerificationCode({ to, code }) {
    const message = `Your verification code is: ${code}. This code will expire in 10 minutes. Do not share this code with anyone.`;
    return this.sendSMS({ to, message });
  }

  async sendOrderNotification({ to, orderNumber, status }) {
    const message = `Your order #${orderNumber} status has been updated to: ${status}. Thank you for shopping with us!`;
    return this.sendSMS({ to, message });
  }

  async sendLowStockAlert({ to, productName, quantity }) {
    const message = `ALERT: ${productName} is running low. Current stock: ${quantity} units. Please reorder soon.`;
    return this.sendSMS({ to, message });
  }

  async sendPaymentConfirmation({ to, amount, orderNumber }) {
    const message = `Payment of $${amount} received for order #${orderNumber}. Thank you!`;
    return this.sendSMS({ to, message });
  }
}

module.exports = new SMSService();
