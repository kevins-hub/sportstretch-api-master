const stripe = require("stripe")(process.env.STRIPE_SECRET_TEST);

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
    } catch (error) {
      console.error(
        `Error capturing payment for booking ID ${booking.bookings_id}:`,
        error
      );
      await updateBookingStatus(booking.bookings_id, "CancelledRefunded");
    }
  };

  module.exports = {
    chargeBooking,
  };
  