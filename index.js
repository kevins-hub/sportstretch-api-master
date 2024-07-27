const express = require("express");
const app = express();
const cron = require("node-cron")
const config = require("config");
const therapists = require("./routes/therapists");
const bookings = require("./routes/bookings");
const ratings = require("./routes/ratings");
const register = require("./routes/register");
const auth = require("./routes/auth");
const password = require("./routes/password");
const expoPushTokens = require("./routes/expoPushTokens");
const notifications = require("./routes/notifications");
const contact = require("./routes/contact");
const payment = require("./routes/payment");
const report = require("./routes/report");
const emailService = require("./utilities/email.js");
const upload = require("./routes/upload.js")
const profilePicture = require("./routes/profilePicture.js")
const schedule = require("node-schedule")
const stripe = require("stripe")(process.env.STRIPE_SECRET_TEST);

const Pool = require("pg").Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

app.use(express.json());
app.use("/therapists", therapists);
app.use("/bookings", bookings);
app.use("/ratings", ratings);
app.use("/register", register);
app.use("/auth", auth);
app.use("/password", password);
app.use("/expoPushTokens", expoPushTokens);
app.use("/notifications", notifications);
app.use("/contact", contact);
app.use("/payment", payment);
app.use("/report", report);
app.use("/upload", upload)
app.use("/profilePicture", profilePicture);

app.get("/", (req, res) => {
  res.send("Sportstretch server is running!");
});

const getTodaysBookings = async ()  => {
  // get all bookings from tb_bookings where booking_date = today (YYYY-MM-DD)
  const today = new Date();
  today.setDate(today.getDate());
  const todayString = today.toISOString().split("T")[0];
  const result = await pool.query(
    "SELECT * FROM tb_bookings WHERE booking_date = $1",
    [todayString]
  );
  return result.rows;
}

const updateBookingStatus = async (bookingId, status) => {
  const result = await pool.query(
    "UPDATE tb_bookings SET status = $1 WHERE bookings_id = $2",
    [status, bookingId]
  );
  return result.rowCount === 1;
}

const getAthleteTherapistContactInfo = async (therapist_id, athlete_id) => {
  // query tb_authorization, tb_therapist, and tb_athlete to get therapist auth id, therapist first name, therapist email, athlete auth id, athlete first name, and athlete email
  const therapistResult = await pool.query(
    "SELECT authorization_id, first_name, email FROM tb_authorization JOIN tb_therapist ON tb_authorization.authorization_id = tb_therapist.fk_authorization_id WHERE therapist_id = $1",
    [therapist_id]
  );
  const athleteResult = await pool.query(
    "SELECT authorization_id, first_name, email FROM tb_authorization JOIN tb_athlete ON tb_authorization.authorization_id = tb_athlete.fk_authorization_id WHERE athlete_id = $1",
    [athlete_id]
  );
  return {
    therapist: therapistResult.rows[0], // { authorization_id, first_name, email }
    athlete: athleteResult.rows[0], // { authorization_id, first_name, email }
  };

}

// cron job to run at midnight and send reminder emails to all therapists and athletes with appointments the next day
schedule.scheduleJob("45 * * * *", async () => {
  const today = new Date();
  today.setDate(today.getDate());
  const todayString = today.toISOString().split("T")[0];

  const bookingQueryResult = await pool.query(
    "SELECT bookings_id, fk_therapist_id, fk_athlete_id FROM tb_bookings WHERE booking_date = $1",
    [todayString]
  );
  const sentEmails = new Set();
  const bookings = bookingQueryResult.rows;
  bookings.forEach(async (booking) => {
    try {
      const { therapist, athlete } = await getAthleteTherapistContactInfo(booking.fk_therapist_id, booking.fk_athlete_id);
      if (!sentEmails.has(therapist.email)) {
        emailService.sendBookingReminderEmail(therapist.email, therapist.first_name);
        sentEmails.add(therapist.email);
      }
      if (!sentEmails.has(athlete.email)) {
        emailService.sendBookingReminderEmail(athlete.email, athlete.first_name);
        sentEmails.add(athlete.email);
      }
    } catch (err) {
      console.error(`Error sending booking reminder email for booking: bookingId: ${booking.bookings_id}`, err);
    }
  });
});

// TODO: schedule job to run 30 minutes after midnight to charge athletes for their appointments
schedule.scheduleJob("45 * * * *", async () => {
  // charge payment intent
  try {
    console.warn("charging payment intents");
    const bookingsToday = await getTodaysBookings();
    console.warn("bookingsToday = ", bookingsToday);
    bookingsToday.forEach(async (booking) => {
      try {
        const bookingId = booking.bookings_id;
        const paymentIntentId = booking.payment_intent_id;
        const paymentIntentCapture = await stripe.paymentIntents.capture(paymentIntentId);
        console.warn("paymentIntentCapture = ", paymentIntentCapture);
        await  updateBookingStatus(bookingId, "Paid");
        console.warn(`Payment for booking ID ${bookingId} successful. (Payment Intent: ${paymentIntentCapture})`);
      } catch (error) {
        console.error(`Error capturing payment for booking ID ${booking.bookings_id}:`, error);
        await updateBookingStatus(booking.bookings_id, "CancelledRefunded");
      }
    });
  } catch (error) {
    console.error("Error batch charging payment intents:", error);
  }

});


const port = process.env.PORT || config.get("port");

app.listen(port, () => {
  console.log("Server running on port " + port);
});
