const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class AirtelMoneyService {
  constructor() {
    this.baseUrl = process.env.AIRTEL_MONEY_BASE_URL || 'https://openapiuat.airtel.africa';
    this.clientId = process.env.AIRTEL_MONEY_CLIENT_ID;
    this.clientSecret = process.env.AIRTEL_MONEY_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    try {
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      const response = await axios.post(
        `${this.baseUrl}/auth/oauth2/token`,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;

      return this.accessToken;
    } catch (error) {
      logger.error('Airtel Money Access Token Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async initiatePayment(amount, currency, phoneNumber, reference) {
    try {
      const token = await this.getAccessToken();
      const transactionId = reference || uuidv4();

      const response = await axios.post(
        `${this.baseUrl}/merchant/v1/payments/`,
        {
          reference: transactionId,
          subscriber: {
            country: process.env.AIRTEL_MONEY_COUNTRY || 'UG',
            currency,
            msisdn: phoneNumber.replace(/\+/g, ''),
          },
          transaction: {
            amount: amount.toString(),
            country: process.env.AIRTEL_MONEY_COUNTRY || 'UG',
            currency,
            id: transactionId,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Country': process.env.AIRTEL_MONEY_COUNTRY || 'UG',
            'X-Currency': currency,
          },
        }
      );

      return {
        success: true,
        transactionId,
        status: response.data.status?.toLowerCase() || 'pending',
        data: response.data,
      };
    } catch (error) {
      logger.error('Airtel Money Payment Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getTransactionStatus(transactionId) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/standard/v1/payments/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Country': process.env.AIRTEL_MONEY_COUNTRY || 'UG',
            'X-Currency': process.env.AIRTEL_MONEY_CURRENCY || 'UGX',
          },
        }
      );

      return {
        success: true,
        status: response.data.status?.toLowerCase() || 'unknown',
        data: response.data,
      };
    } catch (error) {
      logger.error('Airtel Money Get Transaction Status Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async disbursement(amount, currency, phoneNumber, reference) {
    try {
      const token = await this.getAccessToken();
      const transactionId = reference || uuidv4();

      const response = await axios.post(
        `${this.baseUrl}/standard/v1/disbursements/`,
        {
          payee: {
            msisdn: phoneNumber.replace(/\+/g, ''),
          },
          reference: transactionId,
          transaction: {
            amount: amount.toString(),
            id: transactionId,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Country': process.env.AIRTEL_MONEY_COUNTRY || 'UG',
            'X-Currency': currency,
          },
        }
      );

      return {
        success: true,
        transactionId,
        status: response.data.status?.toLowerCase() || 'pending',
        data: response.data,
      };
    } catch (error) {
      logger.error('Airtel Money Disbursement Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }
}

module.exports = new AirtelMoneyService();
