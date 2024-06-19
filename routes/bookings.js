const express = require("express");
const router = express.Router();
const config = require("config");
const auth = require("../middleware/auth");
const emailService = require("../utilities/email.js");

const Pool = require("pg").Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

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
    const query =
      "SELECT B.bookings_id, B.athlete_location, T.first_name, B.booking_time, B.confirmation_status, B.status, B.duration, B.booking_date, B.total_cost FROM tb_bookings B join tb_therapist T ON B.fk_therapist_id = T.therapist_id WHERE B.fk_athlete_id = $1 and booking_time >= (CURRENT_TIMESTAMP - interval '1 hour') ORDER BY B.bookings_id DESC";
    const upcomingBookings = await pool.query(query, [athleteId]);
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
    } = req.body;
    const newBooking = await pool.query(
      "INSERT INTO tb_bookings (fk_athlete_id, athlete_location, fk_therapist_id, booking_time, booking_date, hourly_rate, duration, total_cost, paid, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING bookings_id, booking_time",
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
    const query =
      "SELECT  B.bookings_id,B.athlete_location, A.first_name, B.booking_time, B.confirmation_status, B.status, B.duration, B.booking_date, B.total_cost FROM tb_bookings B join tb_athlete A ON B.fk_athlete_id = A.athlete_id WHERE B.fk_therapist_id=$1 and booking_time >= (CURRENT_TIMESTAMP - interval '1 hour')";
    const upcomingBookings = await pool.query(query, [therapistId]);
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
      "UPDATE tb_bookings SET confirmation_status = $1, confirmation_time = CURRENT_TIMESTAMP  WHERE bookings_id = $2 RETURNING bookings_id, confirmation_status, confirmation_time, fk_athlete_id",
      [confirmation_status, bookings_id]
    );
    const athleteId = bookingStatus.rows[0].fk_athlete_id;
    const athleteEmailQuery = await pool.query(
      "SELECT email FROM tb_authorization WHERE authorization_id = (SELECT fk_authorization_id FROM tb_athlete WHERE athlete_id = $1)",
      [athleteId]
    );
    const bookingId = bookingStatus.rows[0].bookings_id;
    const therapistNameQuery = await pool.query(
      "SELECT first_name FROM tb_therapist WHERE therapist_id = (SELECT fk_therapist_id FROM tb_bookings WHERE bookings_id = $1)",
      [bookingId]
    );
    const therapistAcceptBookingCountUpdate = await pool.query(
      "UPDATE tb_therapist SET accepted_booking_count = accepted_booking_count + 1 WHERE therapist_id = (SELECT fk_therapist_id FROM tb_bookings WHERE bookings_id = $1)",
      [bookingId]
    );
    res.status(200).json({
      bookings_id: bookingStatus.rows[0].bookings_id,
      confirmation_status: bookingStatus.rows[0].confirmation_status,
      confirmation_time: bookingStatus.rows[0].confirmation_time,
      athlete_id: bookingStatus.rows[0].fk_athlete_id,
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
    const bookingStatus = await pool.query(
      "UPDATE tb_bookings SET confirmation_status = $1, decline_reason = $2, confirmation_time = CURRENT_TIMESTAMP WHERE bookings_id = $3 RETURNING bookings_id, confirmation_status, confirmation_time, fk_athlete_id",
      [confirmation_status, reason, bookings_id]
    );
    const athleteId = bookingStatus.rows[0].fk_athlete_id;
    const athleteEmailQuery = await pool.query(
      "SELECT email FROM tb_authorization WHERE authorization_id = (SELECT fk_authorization_id FROM tb_athlete WHERE athlete_id = $1)",
      [athleteId]
    );
    const bookingId = bookingStatus.rows[0].bookings_id;
    const therapistNameQuery = await pool.query(
      "SELECT first_name FROM tb_therapist WHERE therapist_id = (SELECT fk_therapist_id FROM tb_bookings WHERE bookings_id = $1)",
      [bookingId]
    );
    res.status(200).json({
      bookings_id: bookingStatus.rows[0].bookings_id,
      confirmation_status: bookingStatus.rows[0].confirmation_status,
      confirmation_time: bookingStatus.rows[0].confirmation_time,
      decline_reason: bookingStatus.rows[0].decline_reason,
      athlete_id: bookingStatus.rows[0].fk_athlete_id,
    });
    emailService.sendBookingDeclinedEmail(athleteEmailQuery.rows[0].email, bookingId, therapistNameQuery.rows[0].first_name, reason);
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
      "SELECT booking_time, fk_therapist_id, fk_athlete_id FROM tb_bookings WHERE bookings_id = $1",
      [bookings_id]
    );
    const booking_time = booking.rows[0].booking_time;
    const now = new Date().getTime();
    const diff = new Date(booking_time).getTime() - now;
    const status = diff > 86400000 ? "CancelledRefunded" : "CancelledNoRefund";
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
      "UPDATE tb_bookings SET status = $1 WHERE bookings_id = $2 RETURNING bookings_id, status",
      [status, bookings_id]
    );
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
