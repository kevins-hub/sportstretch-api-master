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

router.post("/reportIssue", auth, async (req, res) => {
  try {
    const { issue, booking_id, reporter_auth_id } = req.body;
    const reporterEmail = await pool.query(
      "SELECT email FROM tb_authorization WHERE authorization_id = $1",
      [reporter_auth_id]
    );
    emailService.sendReportIssueEmail(issue, reporterEmail, booking_id);
    emailService.sendReportIssueConfirmationEmail(
      issue,
      reporterEmail,
      booking_id
    );
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

module.exports = router;
