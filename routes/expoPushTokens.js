const express = require("express");
const router = express.Router();
const config = require("config");
const auth = require("../middleware/auth");

const Pool = require("pg").Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

router.post("/", auth, async (req, res) => {
  try {
    const { token } = req.body;
    const authId = req.user.authorization_id;
    if (!authId) return res.status(400).send({ error: "Invalid user." });
    await pool.query(
      "UPDATE tb_authorization SET expo_push_token = $1 where authorization_id = $2",
      [token, authId]
    );
    console.log("User registered for notifications: ", user);
    res.status(201).send();
  } catch (err) {
    console.log(err.message);
  }
});

module.exports = router;
