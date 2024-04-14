const express = require("express");
const router = express.Router();
const config = require("config");
const auth = require("../middleware/auth");
const sendPushNotification = require("../utilities/pushNotifications");
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
    const result = await pool.query(
      "SELECT expo_push_token from tb_authorization JOIN tb_therapist ON authorization_id = fk_authorization_id where therapist_id = $1",
      [therapistId]
    );
    const therapistToken = result.rows[0].expo_push_token;
    if (!therapistToken)
      return res.status(400).send({ error: "Therapist token not available." });

    if (Expo.isExpoPushToken(therapistToken))
      await sendPushNotification(therapistToken, message);

    res.status(201).send();
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.post("/notifyAthlete", auth, async (req, res) => {
  try {
    const { athleteId, message } = req.body;
    const result = await pool.query(
      "SELECT expo_push_token from tb_authorization JOIN tb_athlete ON authorization_id = fk_authorization_id where athlete_id = $1",
      [athleteId]
    );
    const athleteToken = result.rows[0].expo_push_token;
    if (!athleteToken)
      return res.status(400).send({ error: "Athlete token not available." });

    if (Expo.isExpoPushToken(athleteToken))
      await sendPushNotification(athleteToken, message);

    res.status(201).send();
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

module.exports = router;
