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
    "SELECT * FROM tb_bookings WHERE date = $1",
    [todayString]
  );
  return result.rows;
}

const updateBookingStatus = async (bookingId, status) => {
  const result = await pool.query(
    "UPDATE tb_bookings SET status = $1 WHERE booking_id = $2",
    [status, bookingId]
  );
  return result.rowCount === 1;
}

// cron job to run at midnight and send reminder emails to all therapists and athletes with appointments the next day
schedule.scheduleJob("5 0 * * *", async () => {
  const today = new Date();
  today.setDate(today.getDate());
  const todayString = today.toISOString().split("T")[0];
  const therapistsQueryResult = await pool.query(
    "SELECT email, first_name, last_name FROM tb_therapist WHERE therapist_id IN (SELECT fk_therapist_id FROM tb_bookings WHERE date = $1)",
    [todayString]
  );
  const athletesQueryResult = await pool.query(
    "SELECT email, first_name, last_name FROM tb_athlete WHERE athlete_id IN (SELECT fk_athlete_id FROM tb_bookings WHERE date = $1)",
    [todayString]
  );
  const therapists = therapistsQueryResult.rows;
  const athletes = athletesQueryResult.rows;
  // keep set of sent email addresses to avoid sending multiple emails to the same person
  const sentEmails = new Set();
  therapists.forEach((therapist) => {
    if (!sentEmails.has(therapist.email)) {
      emailService.sendBookingReminderEmail(therapist.email, therapist.first_name);
      sentEmails.add(therapist.email);
    }
  });
  athletes.forEach((athlete) => {
    if (!sentEmails.has(athlete.email)) {
      emailService.sendBookingReminderEmail(athlete.email, athlete.first_name);
      sentEmails.add(athlete.email);
    }
  });
});

// TODO: schedule job to run 30 minutes after midnight to charge athletes for their appointments
schedule.scheduleJob("35 0 * * *", async () => {
  // charge payment intent
  try {
    console.warn("charging payment intents");
    const bookingsToday = await getTodaysBookings();
    console.warn("bookingsToday = ", bookingsToday);
    bookingsToday.forEach(async (booking) => {
      try {
        const bookingId = booking.bookings_id;
        const paymentIntentId = booking.payment_intent_id;
        const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
        await  updateBookingStatus(bookingId, "Paid");
        console.warn(`Payment for booking ID ${bookingId} successful. (Payment Intent: ${paymentIntent})`);
      } catch (error) {
        console.error(`Error capturing payment for booking ID ${bookingId}:`, error);
        await updateBookingStatus(bookingId, "CancelledRefunded");
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
