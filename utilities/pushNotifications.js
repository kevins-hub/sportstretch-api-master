const { Expo } = require("expo-server-sdk");
const Pool = require("pg").Pool;
const config = require("config");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

const sendNotification = async (userType, id, message) => {
  try {
    if (userType === "admin") {
      const adminNotificationSuccess = await sendAdminNotification(message);
      return adminNotificationSuccess;
    }
    let token;
    if (userType === "therapist") {
      const result = await pool.query(
        "SELECT expo_push_token from tb_authorization JOIN tb_therapist ON authorization_id = fk_authorization_id where therapist_id = $1",
        [id]
      );
      token = result.rows[0].expo_push_token;
    } else if (userType === "athlete") {
      const result = await pool.query(
        "SELECT expo_push_token from tb_authorization JOIN tb_athlete ON authorization_id = fk_authorization_id where athlete_id = $1",
        [id]
      );
      token = result.rows[0].expo_push_token;
    }
    if (!token) {
      return false;
    }
    if (Expo.isExpoPushToken(token)) {
      await sendPushNotification(token, message);
    }
    return true;
  } catch (err) {
    console.error(`Internal Server Error: ${err}`);
    return false;
  }
};

const sendAdminNotification = async (message) => {
  try {
    const adminAuthIdResult = await pool.query(
      "SELECT authorization_id from tb_authorization where role='admin'"
    );

    const adminAuthIds = adminAuthIdResult.rows.map(
      (row) => row.authorization_id
    );
    adminAuthIds.forEach(async (authId) => {
      const result = await pool.query(
        "SELECT expo_push_token from tb_authorization where authorization_id = $1",
        [authId]
      );
      token = result.rows[0].expo_push_token;
      console.error(
        "Error sending push notification to admin with authId: ",
        authId
      );
      await sendPushNotification(token, message);
    });
    return true;
  } catch (err) {
    console.error(`Error sending push notifications to admins: ${err}`);
    return false;
  }
};

const sendPushNotification = async (targetExpoPushToken, message) => {
  const expo = new Expo();
  const chunks = expo.chunkPushNotifications([
    {
      to: targetExpoPushToken,
      sound: "default",
      body: message,
      data: { _displayInForeground: true },
    },
  ]);

  const sendChunks = async () => {
    // This code runs synchronously. We're waiting for each chunk to be send.
    // A better approach is to use Promise.all() and send multiple chunks in parallel.
    chunks.forEach(async (chunk) => {
      console.log("Sending Chunk", chunk);
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        console.log("Tickets", tickets);
      } catch (error) {
        console.log("Error sending chunk", error);
      }
    });
  };

  await sendChunks();
};

module.exports = sendNotification;
