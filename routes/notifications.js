const express = require("express");
const router = express.Router();
const config = require("config");
const auth = require("../middleware/auth");
const sendNotification = require("../utilities/pushNotifications");
const { Expo } = require("expo-server-sdk");

const Pool = require("pg").Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

router.post("/notifyTherapist", auth, async (req, res) => {
  try {
    const { therapistId, message } = req.body;

    const sendNotificationSuccess = await sendNotification(
      "therapist",
      therapistId,
      message
    );

    if (!sendNotificationSuccess) {
      return res.status(500).send("Internal Server Error.");
    }
    return res.status(201).send();
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.post("/notifyAthlete", auth, async (req, res) => {
  try {
    const { athleteId, message } = req.body;

    const sendNotificationSuccess = await sendNotification(
      "athlete",
      athleteId,
      message
    );

    if (!sendNotificationSuccess) {
      return res.status(500).send("Internal Server Error.");
    }
    return res.status(201).send();
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.post("/notifyAdmin", auth, async (req, res) => {
  try {
    const { message } = req.body;

    const sendNotificationSuccess = await sendNotification(
      "admin",
      1,
      message
    );

    if (!sendNotificationSuccess) {
      return res.status(500).send("Internal Server Error.");
    }
    return res.status(201).send();
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
}
);


module.exports = router;
