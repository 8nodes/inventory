const Stripe = require('stripe');
const logger = require('../utils/logger');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class StripeService {
  async createPaymentIntent(amount, currency, metadata) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      logger.error('Stripe Payment Intent Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        success: paymentIntent.status === 'succeeded',
        status: paymentIntent.status,
        paymentIntent,
      };
    } catch (error) {
      logger.error('Stripe Confirm Payment Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createRefund(paymentIntentId, amount) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });

      return {
        success: true,
        refund,
      };
    } catch (error) {
      logger.error('Stripe Refund Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createCheckoutSession(lineItems, metadata, successUrl, cancelUrl) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      logger.error('Stripe Checkout Session Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async constructWebhookEvent(payload, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      return { success: true, event };
    } catch (error) {
      logger.error('Stripe Webhook Error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new StripeService();
