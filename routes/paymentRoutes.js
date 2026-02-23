import express from 'express';
import crypto from 'crypto';
import verifyToken from '../utils/verifytoken.js';

const router = express.Router();


// Mock payment verification
router.post('/verify', verifyToken, async (req, res) => {
  const { transactionId, verificationCode, upiId, amount } = req.body;

  console.log('🔐 Payment verification request:', {
    transactionId,
    verificationCode,
    upiId,
    amount
  });

  // ⚠️ MOCK VERIFICATION - REPLACE WITH REAL GATEWAY API
  // In production, you would:
  // 1. Call Razorpay/Paytm/PhonePe verify API
  // 2. Pass transaction ID to gateway
  // 3. Gateway returns payment status (success/failed)
  // 4. NEVER trust client input - always verify with gateway

  try {
    // MOCK: Accept only code "123456" for demo
    const isValid = verificationCode === '123456';

    if (isValid) {
      // ✅ In production: Log successful payment to database
      console.log('✅ Payment verified successfully');

      res.json({
        success: true,
        verified: true,
        transactionId,
        message: 'Payment verified successfully',
        // In production, include these from gateway response:
        gatewayTransactionId: 'GATEWAY_' + transactionId,
        paymentMethod: 'UPI',
        timestamp: new Date().toISOString()
      });

    } else {
      console.log('❌ Invalid verification code');

      res.json({
        success: false,
        verified: false,
        message: 'Invalid verification code'
      });
    }

  } catch (error) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({
      success: false,
      verified: false,
      error: 'Verification failed'
    });
  }
});


/*
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create payment order
router.post('/create-order', verifyToken, async (req, res) => {
  const { amount, currency = 'INR' } = req.body;

  try {
    const options = {
      amount: amount * 100, // Amount in paise
      currency,
      receipt: 'order_' + Date.now(),
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });

  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Verify Razorpay payment signature
router.post('/verify-razorpay', verifyToken, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    // Generate expected signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    // Verify signature
    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Payment is verified - update order status in database
      console.log('✅ Razorpay payment verified');

      res.json({
        success: true,
        verified: true,
        paymentId: razorpay_payment_id
      });

    } else {
      console.log('❌ Invalid Razorpay signature');

      res.status(400).json({
        success: false,
        verified: false,
        error: 'Invalid payment signature'
      });
    }

  } catch (error) {
    console.error('Razorpay verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Razorpay webhook for payment updates
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const body = req.body;

  try {
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature === signature) {
      const event = JSON.parse(body);

      // Handle different event types
      switch (event.event) {
        case 'payment.captured':
          // Update order as paid
          console.log('Payment captured:', event.payload.payment.entity.id);
          break;

        case 'payment.failed':
          // Update order as failed
          console.log('Payment failed:', event.payload.payment.entity.id);
          break;

        default:
          console.log('Unhandled event:', event.event);
      }

      res.json({ status: 'ok' });

    } else {
      res.status(400).json({ error: 'Invalid webhook signature' });
    }

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
*/

// ============================================
// PAYTM INTEGRATION EXAMPLE
// ============================================

/*
import PaytmChecksum from 'paytmchecksum';

router.post('/paytm/initiate', verifyToken, async (req, res) => {
  const { orderId, amount, customerId } = req.body;

  const paytmParams = {
    body: {
      requestType: 'Payment',
      mid: process.env.PAYTM_MID,
      websiteName: process.env.PAYTM_WEBSITE,
      orderId: orderId,
      callbackUrl: `${process.env.BACKEND_URL}/api/payments/paytm/callback`,
      txnAmount: {
        value: amount,
        currency: 'INR'
      },
      userInfo: {
        custId: customerId
      }
    }
  };

  try {
    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams.body),
      process.env.PAYTM_MERCHANT_KEY
    );

    paytmParams.head = {
      signature: checksum
    };

    res.json({
      success: true,
      paytmParams,
      paytmUrl: `https://securegw${process.env.NODE_ENV === 'production' ? '' : '-stage'}.paytm.in/theia/api/v1/initiateTransaction`
    });

  } catch (error) {
    console.error('Paytm initiate error:', error);
    res.status(500).json({ error: 'Failed to initiate Paytm payment' });
  }
});

router.post('/paytm/callback', async (req, res) => {
  const paytmParams = req.body;

  const isValidChecksum = PaytmChecksum.verifySignature(
    paytmParams,
    process.env.PAYTM_MERCHANT_KEY,
    paytmParams.CHECKSUMHASH
  );

  if (isValidChecksum) {
    // Verify transaction status with Paytm
    const paytmStatusParams = {
      body: {
        mid: process.env.PAYTM_MID,
        orderId: paytmParams.ORDERID
      }
    };

    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmStatusParams.body),
      process.env.PAYTM_MERCHANT_KEY
    );

    paytmStatusParams.head = {
      signature: checksum
    };

    // Call Paytm status API
    // Update order based on status
    // Redirect user

    res.redirect(`${process.env.FRONTEND_URL}/payment-success?orderId=${paytmParams.ORDERID}`);

  } else {
    res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
  }
});
*/

export default router;