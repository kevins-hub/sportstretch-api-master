const express = require("express");
const app = express();
const cron = require("node-cron");
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
const upload = require("./routes/upload.js");
const profilePicture = require("./routes/profilePicture.js");
const schedule = require("node-schedule");
const sendNotification = require("./utilities/pushNotifications");
const { send } = require("express/lib/response.js");
// const stripe = require("stripe")(process.env.STRIPE_SECRET_TEST);
// const stripeUtil = require("./utilities/stripe.js");

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
app.use("/upload", upload);
app.use("/profilePicture", profilePicture);

app.get("/", (req, res) => {
  res.send("Sportstretch server is running!");
});

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
};

// cron job to run at 7AM UTC (3AM ET, 12AM PST) and send reminder emails to all therapists and athletes with appointments the next day
schedule.scheduleJob("0 7 * * *", async () => {
  const today = new Date();
  today.setDate(today.getDate());
  const todayString = today.toISOString().split("T")[0];

  const bookingQueryResult = await pool.query(
    "SELECT bookings_id, fk_therapist_id, fk_athlete_id FROM tb_bookings WHERE booking_date = $1",
    [todayString]
  );
  const sentEmails = new Set();
  const bookings = bookingQueryResult.rows;
  const athleteId = bookings[0].fk_athlete_id;
  const therapistId = bookings[0].fk_therapist_id;
  bookings.forEach(async (booking) => {
    try {
      const { therapist, athlete } = await getAthleteTherapistContactInfo(
        booking.fk_therapist_id,
        booking.fk_athlete_id
      );
      if (!sentEmails.has(therapist.email)) {
        emailService.sendBookingReminderEmail(
          therapist.email,
          therapist.first_name
        );
        sentEmails.add(therapist.email);
      }
      if (!sentEmails.has(athlete.email)) {
        emailService.sendBookingReminderEmail(
          athlete.email,
          athlete.first_name
        );
        sentEmails.add(athlete.email);
      }
      const athletePushSendSuccess = sendNotification("therapist", therapistId, "Reminder: you have appointment(s) scheduled for today! Open SportStretch to view details.");
      if (!athletePushSendSuccess) {
        console.error(
          `Error sending athlete booking reminder push notification for booking: bookingId: ${booking.bookings_id}`
        );
      }
      const therapistPushSendSuccess = sendNotification("athlete", athleteId, "Reminder: you have appointment(s) scheduled for today! Open SportStretch to view details.");
      if (!therapistPushSendSuccess) {
        console.error(
          `Error sending specialist booking reminder push notification for booking: bookingId: ${booking.bookings_id}`
        );
      }
    } catch (err) {
      console.error(
        `Error sending booking reminder email for booking: bookingId: ${booking.bookings_id}`,
        err
      );
    }
  });
});

// ToDo: uncomment / modify after gaining more clarity on charging requirements
// Schedule job to run noon UTC (8AM ET, 5AM PST)  to charge athletes for their appointments for the day
// schedule.scheduleJob("0 12 * * *", async () => {
//   try {
//     const bookingsToday = await getTodaysBookings();
//     bookingsToday.forEach(async (booking) => {
//       await stripeUtil.chargeBooking(booking);
//     });
//   } catch (error) {
//     console.error("Error batch charging payment intents:", error);
//   }
// });

const port = process.env.PORT || config.get("port");

app.listen(port, () => {
  console.log("Server running on port " + port);
});
