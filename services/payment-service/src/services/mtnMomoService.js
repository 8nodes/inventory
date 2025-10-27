const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class MTNMomoService {
  constructor() {
    this.baseUrl = process.env.MTN_MOMO_BASE_URL;
    this.apiKey = process.env.MTN_MOMO_API_KEY;
    this.apiUser = process.env.MTN_MOMO_API_USER;
    this.subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    try {
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      const authString = Buffer.from(`${this.apiUser}:${this.apiKey}`).toString('base64');

      const response = await axios.post(
        `${this.baseUrl}/collection/token/`,
        {},
        {
          headers: {
            'Authorization': `Basic ${authString}`,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;

      return this.accessToken;
    } catch (error) {
      logger.error('MTN MoMo Access Token Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async requestToPay(amount, currency, phoneNumber, payerMessage, payeeNote) {
    try {
      const token = await this.getAccessToken();
      const referenceId = uuidv4();

      const response = await axios.post(
        `${this.baseUrl}/collection/v1_0/requesttopay`,
        {
          amount: amount.toString(),
          currency,
          externalId: referenceId,
          payer: {
            partyIdType: 'MSISDN',
            partyId: phoneNumber.replace(/\+/g, ''),
          },
          payerMessage: payerMessage || 'Payment',
          payeeNote: payeeNote || 'Payment received',
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Reference-Id': referenceId,
            'X-Target-Environment': process.env.MTN_MOMO_ENVIRONMENT || 'sandbox',
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        referenceId,
        status: 'pending',
      };
    } catch (error) {
      logger.error('MTN MoMo Request To Pay Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getTransactionStatus(referenceId) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/collection/v1_0/requesttopay/${referenceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': process.env.MTN_MOMO_ENVIRONMENT || 'sandbox',
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      return {
        success: true,
        status: response.data.status,
        data: response.data,
      };
    } catch (error) {
      logger.error('MTN MoMo Get Transaction Status Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getBalance() {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/collection/v1_0/account/balance`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': process.env.MTN_MOMO_ENVIRONMENT || 'sandbox',
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      return {
        success: true,
        balance: response.data,
      };
    } catch (error) {
      logger.error('MTN MoMo Get Balance Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }
}

module.exports = new MTNMomoService();
