const stripe = require("stripe")(process.env.ENVIRONMENT === 'qa' ? process.env.STRIPE_SECRET_TEST : process.env.STRIPE_SECRET);
const config = require("config");

const CANCELLATION_FEE_AMOUNT = 2000;

const Pool = require("pg").Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

const updateBookingStatus = async (bookingId, status) => {
  const result = await pool.query(
    "UPDATE tb_bookings SET status = $1 WHERE bookings_id = $2",
    [status, bookingId]
  );
  return result.rowCount === 1;
};

const getTherapistStripeAccountId = async (therapist_id) => {
  const result = await pool.query(
    "SELECT stripe_account_id FROM tb_therapist WHERE therapist_id = $1",
    [therapist_id]
  );
  return result.rows[0].stripe_account_id;
};

const chargeBooking = async (booking) => {
  try {
    const bookingId = booking.bookings_id;
    const paymentIntentId = booking.payment_intent_id;
    const therapistId = booking.fk_therapist_id;
    const therapistStripeAccountId = await getTherapistStripeAccountId(
      therapistId
    );
    const paymentIntentCapture = await stripe.paymentIntents.capture(
      paymentIntentId,
      {},
      {
        stripeAccount: therapistStripeAccountId,
      }
    );
    console.warn("paymentIntentCapture = ", paymentIntentCapture);
    await updateBookingStatus(bookingId, "Paid");
    console.warn(
      `Payment for booking ID ${bookingId} successful. (Payment Intent: ${paymentIntentCapture})`
    );
    return true;
  } catch (error) {
    console.error(
      `Error capturing payment for booking ID ${booking.bookings_id}:`,
      error
    );
    await updateBookingStatus(booking.bookings_id, "CancelledRefunded");
    return false;
  }
};

const processRefund = async (
  paymentIntentId,
  stripeAccountId,
  amount = null
) => {
  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        //amount: amount,
      },
      {
        stripeAccount: stripeAccountId,
      }
    );
    return refund.status === "succeeded";
  } catch (error) {
    console.error(
      `Error processing refund for payment intent ${paymentIntentId}:`,
      error
    );
    return false;
  }
};

const processRefundMinusFee = async (paymentIntentId, stripeAccountId, bookingCost) => {
  
  const bookingCostInCents = bookingCost * 100;
  const refundAmount = bookingCostInCents - CANCELLATION_FEE_AMOUNT;
  if (refundAmount <= 0) {
    return false;
  }
  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: bookingCostInCents - CANCELLATION_FEE_AMOUNT,
      },
      {
        stripeAccount: stripeAccountId,
      }
    );
    return refund.status === "succeeded";
  } catch (error) {
    console.error(
      `Error processing refund for payment intent ${paymentIntentId}:`,
      error
    );
    return false;
  }
}

module.exports = {
  chargeBooking,
  processRefund,
  processRefundMinusFee,
  getTherapistStripeAccountId,
};
