const axios = require('axios');
const logger = require('../utils/logger');

class PayPalService {
  constructor() {
    this.baseUrl = process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    try {
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;

      return this.accessToken;
    } catch (error) {
      logger.error('PayPal Access Token Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async createOrder(amount, currency, returnUrl, cancelUrl) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: currency,
                value: amount.toFixed(2),
              },
            },
          ],
          application_context: {
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const approvalUrl = response.data.links.find(link => link.rel === 'approve')?.href;

      return {
        success: true,
        orderId: response.data.id,
        approvalUrl,
        data: response.data,
      };
    } catch (error) {
      logger.error('PayPal Create Order Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async captureOrder(orderId) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: response.data.status === 'COMPLETED',
        status: response.data.status,
        data: response.data,
      };
    } catch (error) {
      logger.error('PayPal Capture Order Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async createPayout(amount, currency, recipientEmail, note) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/v1/payments/payouts`,
        {
          sender_batch_header: {
            sender_batch_id: `batch_${Date.now()}`,
            email_subject: 'You have a payout!',
            email_message: note || 'You have received a payout.',
          },
          items: [
            {
              recipient_type: 'EMAIL',
              amount: {
                value: amount.toFixed(2),
                currency,
              },
              note: note || 'Payout from platform',
              receiver: recipientEmail,
            },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        payoutBatchId: response.data.batch_header.payout_batch_id,
        data: response.data,
      };
    } catch (error) {
      logger.error('PayPal Payout Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }
}

module.exports = new PayPalService();
