const express = require("express");
const router = express.Router();
const config = require("config");
const auth = require("../middleware/auth");
const emailService = require("../utilities/email.js");
const stripeUtil = require("../utilities/stripe.js");

const Pool = require("pg").Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

const declineBooking = async (confirmation_status, bookings_id, reason, suggestedBookingDateTime = null) => {
  const bookingStatus = await pool.query(
    "UPDATE tb_bookings SET confirmation_status = $1, decline_reason = $2, confirmation_time = CURRENT_TIMESTAMP WHERE bookings_id = $3 RETURNING bookings_id, confirmation_status, confirmation_time, fk_athlete_id",
    [confirmation_status, reason, bookings_id]
  );
  const booking = bookingStatus.rows[0];
  const athleteId = booking.fk_athlete_id;
  const athleteEmailQuery = await pool.query(
    "SELECT email FROM tb_authorization WHERE authorization_id = (SELECT fk_authorization_id FROM tb_athlete WHERE athlete_id = $1)",
    [athleteId]
  );
  const bookingId = booking.bookings_id;
  const therapistNameQuery = await pool.query(
    "SELECT first_name FROM tb_therapist WHERE therapist_id = (SELECT fk_therapist_id FROM tb_bookings WHERE bookings_id = $1)",
    [bookingId]
  );
  emailService.sendBookingDeclinedEmail(athleteEmailQuery.rows[0].email, bookingId, therapistNameQuery.rows[0].first_name, reason, suggestedBookingDateTime ? suggestedBookingDateTime : null);
  return booking;
};

const eligibleFullRefund = (bookingTime, confirmationTime) => {
  // eligible for refund if booking time is more than 24 hours away or confirmation time is within 24 hours of booking time
  const now = new Date().getTime();
  const bookingDateTime = new Date(bookingTime).getTime();
  const diff = bookingDateTime - now;
  if (diff > 86400000) {
    return true;
  }
  const confirmationDiff = new Date(confirmationTime).getTime() - bookingDateTime;
  if  (confirmationDiff < 0) {
    return false;
  }
  if (confirmationDiff < 86400000) {
    return true;
  }
  return false;
}


router.get("/athlete/pastBookings", auth, async (req, res) => {
  try {
    const athleteId = parseInt(req.query.athleteId, 10);
    const query =
      "SELECT B.bookings_id, B.athlete_location, T.first_name, B.booking_time, B.confirmation_status, R.starrating, B.status, B.duration, B.booking_date, B.total_cost, T.therapist_id FROM tb_bookings B JOIN tb_therapist T ON B.fk_therapist_id = T.therapist_id LEFT JOIN tb_ratings R ON B.bookings_id = R.fk_bookings_id WHERE B.fk_athlete_id = $1 and booking_time < (CURRENT_TIMESTAMP - interval '1 hour') and B.confirmation_status = 1 ORDER BY B.bookings_id DESC";
    const pastBookings = await pool.query(query, [athleteId]);
    res.status(200).json(pastBookings.rows);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.get("/athlete/upcomingBookings", auth, async (req, res) => {
  try {
    const athleteId = parseInt(req.query.athleteId, 10);
    // const query =
    //   "SELECT B.bookings_id, B.athlete_location, T.first_name, B.booking_time, B.confirmation_status, B.status, B.duration, B.booking_date, B.total_cost FROM tb_bookings B join tb_therapist T ON B.fk_therapist_id = T.therapist_id WHERE B.fk_athlete_id = $1 and booking_time >= (CURRENT_TIMESTAMP - interval '1 hour') ORDER BY B.bookings_id DESC";
    
    // rewrite query to include therapist's profile picture from tb_authoriation
    const queryWithTherapistProfilePicture = "SELECT B.bookings_id, B.athlete_location, T.first_name, B.booking_time, B.confirmation_status, B.status, B.duration, B.booking_date, B.total_cost, A.profile_picture_url FROM tb_bookings B join tb_therapist T ON B.fk_therapist_id = T.therapist_id JOIN tb_authorization A ON T.fk_authorization_id = A.authorization_id WHERE B.fk_athlete_id = $1 and booking_time >= (CURRENT_TIMESTAMP - interval '1 hour') ORDER BY B.bookings_id DESC";

    const upcomingBookings = await pool.query(queryWithTherapistProfilePicture, [athleteId]);
    res.status(200).json(upcomingBookings.rows);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const {
      athlete_id,
      athlete_location,
      therapist_id,
      booking_time,
      booking_date,
      hourly_rate,
      duration,
      total_cost,
      paid,
      status,
      payment_intent_id
    } = req.body;
    const newBooking = await pool.query(
      "INSERT INTO tb_bookings (fk_athlete_id, athlete_location, fk_therapist_id, booking_time, booking_date, hourly_rate, duration, total_cost, paid, status, payment_intent_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING bookings_id, booking_time",
      [
        athlete_id,
        athlete_location,
        therapist_id,
        booking_time,
        booking_date,
        hourly_rate,
        duration,
        total_cost,
        paid,
        status,
        payment_intent_id
      ]
    );
    res.status(201).send({
      bookings_id: newBooking.rows[0].bookings_id,
      booking_time: newBooking.rows[0].booking_time,
    });
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.get("/therapist/pastBookings", async (req, res) => {
  try {
    const therapistId = parseInt(req.query.therapistId, 10);
    const query =
      "SELECT  B.bookings_id,B.athlete_location, A.first_name, B.booking_time, B.confirmation_status, B.status, B.duration, B.booking_date, B.total_cost FROM tb_bookings B join tb_athlete A ON B.fk_athlete_id = A.athlete_id WHERE B.fk_therapist_id=$1 and booking_time < (CURRENT_TIMESTAMP - interval '1 hour')  and B.confirmation_status = 1";
    const pastBookings = await pool.query(query, [therapistId]);
    res.status(200).json(pastBookings.rows);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.get("/therapist/upcomingBookings", async (req, res) => {
  try {
    const therapistId = parseInt(req.query.therapistId, 10);
    // const query =
    //   "SELECT  B.bookings_id,B.athlete_location, A.first_name, B.booking_time, B.confirmation_status, B.status, B.duration, B.booking_date, B.total_cost FROM tb_bookings B join tb_athlete A ON B.fk_athlete_id = A.athlete_id WHERE B.fk_therapist_id=$1 and booking_time >= (CURRENT_TIMESTAMP - interval '1 hour')";
    // rewrite query to include athlete's profile picture from tb_authoriation
    const queryWithAthleteProfilePicture = "SELECT  B.bookings_id,B.athlete_location, A.first_name, B.booking_time, B.confirmation_status, B.status, B.duration, B.booking_date, B.total_cost, C.profile_picture_url FROM tb_bookings B join tb_athlete A ON B.fk_athlete_id = A.athlete_id JOIN tb_authorization C ON A.fk_authorization_id = C.authorization_id WHERE B.fk_therapist_id=$1 and booking_time >= (CURRENT_TIMESTAMP - interval '1 hour')";
    const upcomingBookings = await pool.query(queryWithAthleteProfilePicture, [therapistId]);
    res.status(200).json(upcomingBookings.rows);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.put("/therapist/approveBooking/:id", auth, async (req, res) => {
  try {
    const bookings_id = parseInt(req.params.id, 10);
    const confirmation_status = 1;
    const bookingStatus = await pool.query(
      "UPDATE tb_bookings SET confirmation_status = $1, confirmation_time = CURRENT_TIMESTAMP  WHERE bookings_id = $2 RETURNING *",
      [confirmation_status, bookings_id]
    );
    const booking = bookingStatus.rows[0];
    const bookingCharged = await stripeUtil.chargeBooking(booking);
    if (bookingCharged === false) {
      await declineBooking(0, bookings_id, "Booking payment failed. Please book again with valid payment information.");
      res.status(400).send("Athlete's payment failed. They have been notified to try booking again.");
      //ToDo: Send email to athlete that booking payment failed
      return;
    }
    const athleteId = booking.fk_athlete_id;
    const athleteEmailQuery = await pool.query(
      "SELECT email FROM tb_authorization WHERE authorization_id = (SELECT fk_authorization_id FROM tb_athlete WHERE athlete_id = $1)",
      [athleteId]
    );
    const bookingId = booking.bookings_id;
    const therapistNameQuery = await pool.query(
      "SELECT first_name FROM tb_therapist WHERE therapist_id = (SELECT fk_therapist_id FROM tb_bookings WHERE bookings_id = $1)",
      [bookingId]
    );
    const therapistAcceptBookingCountUpdate = await pool.query(
      "UPDATE tb_therapist SET accepted_booking_count = accepted_booking_count + 1 WHERE therapist_id = (SELECT fk_therapist_id FROM tb_bookings WHERE bookings_id = $1)",
      [bookingId]
    );
    res.status(200).json({
      bookings_id: booking.bookings_id,
      confirmation_status: booking.confirmation_status,
      confirmation_time: booking.confirmation_time,
      athlete_id: booking.fk_athlete_id,
    });
    emailService.sendBookingConfirmationEmail(athleteEmailQuery.rows[0].email, bookingId, therapistNameQuery.rows[0].first_name);

  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.put("/therapist/declineBooking/:id", auth, async (req, res) => {
  try {
    const bookings_id = parseInt(req.params.id, 10);
    const reason = req.body.reason ? req.body.reason : "No reason provided";
    const confirmation_status = 0;
    const suggestedBookingDateTime = req.body.suggestedBookingDateTime ? req.body.suggestedBookingDateTime : null;
    const declinedBooking = await declineBooking(confirmation_status, bookings_id, reason, suggestedBookingDateTime);
    // const bookingStatus = await pool.query(
    //   "UPDATE tb_bookings SET confirmation_status = $1, decline_reason = $2, confirmation_time = CURRENT_TIMESTAMP WHERE bookings_id = $3 RETURNING bookings_id, confirmation_status, confirmation_time, fk_athlete_id",
    //   [confirmation_status, reason, bookings_id]
    // );
    // const athleteId = bookingStatus.rows[0].fk_athlete_id;
    // const athleteEmailQuery = await pool.query(
    //   "SELECT email FROM tb_authorization WHERE authorization_id = (SELECT fk_authorization_id FROM tb_athlete WHERE athlete_id = $1)",
    //   [athleteId]
    // );
    // const bookingId = bookingStatus.rows[0].bookings_id;
    // const therapistNameQuery = await pool.query(
    //   "SELECT first_name FROM tb_therapist WHERE therapist_id = (SELECT fk_therapist_id FROM tb_bookings WHERE bookings_id = $1)",
    //   [bookingId]
    // );
    res.status(200).json({
      bookings_id: declinedBooking.bookings_id,
      confirmation_status: declinedBooking.confirmation_status,
      confirmation_time: declinedBooking.confirmation_time,
      decline_reason: declinedBooking.decline_reason,
      athlete_id: declinedBooking.fk_athlete_id,
    });
    // emailService.sendBookingDeclinedEmail(athleteEmailQuery.rows[0].email, bookingId, therapistNameQuery.rows[0].first_name, reason, suggestedBookingDateTime ? suggestedBookingDateTime : null);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

// cancel booking endpoint
// set status to CancelledRefunded if booking_time is more than 24 hours away and CancelledNoRefund if booking_time is less than 24 hours away
router.put("/athlete/cancelBooking/:id", auth, async (req, res) => {
  try {
    const bookings_id = parseInt(req.params.id, 10);
    const booking = await pool.query(
      "SELECT booking_time, confirmation_time, fk_therapist_id, fk_athlete_id, payment_intent_id, total_cost FROM tb_bookings WHERE bookings_id = $1",
      [bookings_id]
    );
    const booking_time = booking.rows[0].booking_time;
    const confirmation_time = booking.rows[0].confirmation_time;
    const status = eligibleFullRefund(booking_time, confirmation_time) ? "CancelledRefunded" : "CancelledNoRefund";
    const stripeAccountId = await stripeUtil.getTherapistStripeAccountId(booking.rows[0].fk_therapist_id);
    if (status === "CancelledRefunded") {
      const refundSucceeded = stripeUtil.processRefund(booking.rows[0].payment_intent_id, stripeAccountId);
      if (!refundSucceeded) {
        res.status(500).send("Refund could not be completed. Please try again later.");
        return;
      }
    } else {
      const total_cost = booking.rows[0].total_cost;
      const refundSucceeded = stripeUtil.processRefundMinusFee(booking.rows[0].payment_intent_id, stripeAccountId, total_cost);
      if (!refundSucceeded) {
        res.status(500).send("Refund could not be completed. Please try again later.");
        return;
      }
    }
    const cancelled = await pool.query(
      "UPDATE tb_bookings SET status = $1 WHERE bookings_id = $2 RETURNING bookings_id, status",
      [status, bookings_id]
    );
    const athleteId = booking.rows[0].fk_athlete_id;
    const therapistId = booking.rows[0].fk_therapist_id;
    const therapistEmailQuery = await pool.query(
      "SELECT email FROM tb_authorization WHERE authorization_id = (SELECT fk_authorization_id FROM tb_therapist WHERE therapist_id = $1)",
      [therapistId]
    );
    const therapistEmail = therapistEmailQuery.rows[0].email;
    const athleteFirstNameQuery = await pool.query(
      "SELECT first_name FROM tb_athlete WHERE athlete_id = $1",
      [athleteId]
    );
    const athleteFirstName = athleteFirstNameQuery.rows[0].first_name;
    res.status(200).json({
      bookings_id: cancelled.rows[0].bookings_id,
      status: cancelled.rows[0].status,
    });
    emailService.sendAthleteCancelledBookingEmail(therapistEmail, bookings_id, athleteFirstName, status === "CancelledRefunded" ? true : false);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

// therapist cancel booking endpoint
// set status to CancelledRefunded
router.put("/therapist/cancelBooking/:id", auth, async (req, res) => {
  try {
    const bookings_id = parseInt(req.params.id, 10);
    const status = "CancelledRefunded";
    const cancelled = await pool.query(
      "UPDATE tb_bookings SET status = $1 WHERE bookings_id = $2 RETURNING bookings_id, status, fk_therapist_id, payment_intent_id",
      [status, bookings_id]
    );
    const stripeAccountId = await stripeUtil.getTherapistStripeAccountId(cancelled.rows[0].fk_therapist_id);
    const refundSucceeded = await stripeUtil.processRefund(cancelled.rows[0].payment_intent_id, stripeAccountId);
    if (!refundSucceeded) {
      res.status(500).send("Refund could not be completed. Please try again later.");
      return;
    }
    res.status(200).json({
      bookings_id: cancelled.rows[0].bookings_id,
      status: cancelled.rows[0].status,
    });
    const booking = await pool.query(
      "SELECT fk_therapist_id, fk_athlete_id FROM tb_bookings WHERE bookings_id = $1",
      [bookings_id]
    );
    const athleteId = booking.rows[0].fk_athlete_id;
    const therapistId = booking.rows[0].fk_therapist_id;
    const athleteEmailQuery = await pool.query(
      "SELECT email FROM tb_authorization WHERE authorization_id = (SELECT fk_authorization_id FROM tb_athlete WHERE athlete_id = $1)",
      [athleteId]
    );
    const therapistNameQuery = await pool.query(
      "SELECT first_name FROM tb_therapist WHERE therapist_id = $1",
      [therapistId]
    );
    emailService.sendTherapistCancelledBookingEmail(athleteEmailQuery.rows[0].email, bookings_id, therapistNameQuery.rows[0].first_name);

  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.get("/all", auth, async (req, res) => {
  try {
    const allBookings = await pool.query(
      "SELECT booking_time, bookings_id, fk_athlete_id, fk_therapist_id, T.first_name as tfname, A.first_name as afname, T.last_name as tlname, A.last_name as alname FROM tb_bookings, tb_therapist T, tb_athlete A WHERE(tb_bookings.fk_athlete_id=A.athlete_id and tb_bookings.fk_therapist_id=T.therapist_id)"
    );
    res.status(200).json(allBookings.rows);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.get("/therapist/currentBookings", auth, async (req, res) => {
  try {
    const therapistId = parseInt(req.query.therapistId, 10);
    const date = req.query.date; // date is YYYY-MM-DD
    const query =
      "SELECT * FROM tb_bookings WHERE fk_therapist_id=$1 AND booking_date=$2 AND confirmation_status=1";

    const currentBookings = await pool.query(query, [therapistId, date]);
    res.status(200).json(currentBookings.rows);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

module.exports = router;
