import Razorpay from 'razorpay';
import crypto from 'crypto';

var razorpayInstance = null;

function getRazorpay() {
  if (razorpayInstance) return razorpayInstance;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return razorpayInstance;
}

export const createRazorpayOrder = async function(opts) {
  var amount = opts.amount;
  var currency = opts.currency || 'INR';
  var notes = opts.notes || {};
  var rp = getRazorpay();
  if (!rp) {
    return { id: 'demo_order_' + Date.now(), amount: amount, currency: currency };
  }
  return rp.orders.create({ amount: amount, currency: currency, notes: notes, receipt: 'SKH-' + Date.now() });
};

export const verifyRazorpaySignature = function(orderId, paymentId, signature) {
  if (!process.env.RAZORPAY_KEY_SECRET) return true;
  var sign = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(orderId + '|' + paymentId)
    .digest('hex');
  return sign === signature;
};

export default { createRazorpayOrder, verifyRazorpaySignature };
