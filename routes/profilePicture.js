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

router.get("/:id", auth, async (req, res) => {
    try {
        const authorization_id = req.params.id;
        if (!authorization_id) {
            return res.status(400).send("Bad request. Missing id.");
        }
        const profilePicture = await pool.query(
        "SELECT profile_picture_url FROM tb_authorization WHERE authorization_id = $1",
        [authorization_id]
        );
        res.status(200).json(profilePicture.rows[0]);
    } catch (err) {
        res.status(500).send(`Internal Server Error: ${err}`);
    }
});

module.exports = router;
