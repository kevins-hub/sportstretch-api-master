const express = require("express");
const router = express.Router();
const config = require("config");
const auth = require("../middleware/auth");
const us_states = require("../constants/us_states");
const emailService = require("../utilities/email.js");

const Pool = require("pg").Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

const isValidEditTherapistRequestBody = async (body) => {
  const {
    addressL1,
    addressL2,
    city,
    state,
    zipcode,
    profession,
    services,
    summary,
    hourlyRate,
    acceptsHouseCalls,
    licenseUrl,
    acceptsInClinic,
  } = body;

  if (
    !addressL1 ||
    !city ||
    !state ||
    !zipcode ||
    !profession ||
    !services ||
    !summary ||
    !hourlyRate ||
    !licenseUrl
  ) {
    return false;
  }

  if (isNaN(hourlyRate)) {
    return false;
  }

  // validate zipcode
  const zipRegex = /^[0-9]{5}$/;
  if (!zipcode.match(zipRegex)) {
    return false;
  }

  const addressRegex = /^[a-zA-Z0-9\s,'.-]*$/;
  if (!addressL1.match(addressRegex) || !addressL2.match(addressRegex)) {
    return false;
  }

  const cityRegex = /^[a-zA-Z\s]*$/;
  if (!city.match(cityRegex)) {
    return false;
  }

  const stateRegex = /^[a-zA-Z\s]*$/;
  if (!state.match(stateRegex)) {
    return false;
  }

  if (summary.length > 250) {
    return false;
  }

  const summaryRegex = /^[\s\S]+$/;
  if (!summary.match(summaryRegex)) {
    return false;
  }

  const servicesRegex = /^[\s\S]+$/;
  if (!services.match(servicesRegex)) {
    return false;
  }

  const professionRegex = /^[a-zA-Z\s]*$/;
  if (!profession.match(professionRegex)) {
    return false;
  }

  return true;
};

router.get("/all", auth, async (req, res) => {
  try {
    // combine profile_picture_url from tb_authorization into allTherapists call
    const allTherapists = await pool.query(
      "SELECT first_name, last_name, mobile, city, state, enabled, average_rating, services, summary, therapist_id, email, license_infourl, profile_picture_url FROM tb_therapist T JOIN tb_authorization A  ON T.fk_authorization_id = A.authorization_id"
    );
    res.status(200).json(allTherapists.rows);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.get("/enabled/online", auth, async (req, res) => {
  try {
    const state = req.query.state;
    if (state) {
      const stateName = us_states[state];
      // combine profile_picture_url from tb_authorization into therapists call
      const therapists = await pool.query(
        "SELECT therapist_id, fk_authorization_id, first_name, last_name, mobile, apartment_no, street, city, state, zipcode, license_infourl, enabled, status, average_rating, profession, summary, hourly_rate, services, accepts_house_calls, business_hours, accepts_in_clinic, stripe_account_id, accepted_booking_count, accepts_payments, profile_picture_url FROM tb_therapist T JOIN tb_authorization A  ON T.fk_authorization_id = A.authorization_id WHERE enabled = 1 and status = true and accepts_payments = true and state = $1",
        [stateName]
      );
      const therapistResults = therapists.rows;
      if (therapistResults.length === 0) {
        res.status(404).send("No therapists found.");
      } else {
        res.status(200).json(therapistResults);
      }
    } else {
      const therapists = await pool.query(
        "SELECT * FROM tb_therapist WHERE enabled = 1 and status = true"
      );
      const therapistResults = therapists.rows;
      if (therapistResults.length === 0) {
        res.status(404).send("No therapists found.");
      } else {
        res.status(200).json(therapistResults);
      }
    }
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.get("/states", auth, async (req, res) => {
  try {
    const states = await pool.query(
      "SELECT DISTINCT state FROM tb_therapist WHERE stripe_account_id IS NOT NULL and enabled = 1 and status = true and accepts_payments = true"
    );
    res.status(200).json(states.rows);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.put("/setAvailability/:id", auth, async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).send("Bad request. Missing required fields.");
    }
    const therapist_id = parseInt(req.params.id, 10);
    const { availability_status } = req.body;
    const status = await pool.query(
      "UPDATE tb_therapist SET status = $1 WHERE therapist_id = $2 RETURNING therapist_id, status",
      [availability_status, therapist_id]
    );
    res.status(200).json({
      therapist_id: status.rows[0].therapist_id,
      availability_status: status.rows[0].status,
    });
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.get("/requests", auth, async (req, res) => {
  try {
    const requests = await pool.query(
      "SELECT first_name, last_name, mobile, email, therapist_id, street, apartment_no, city, state, profession, summary, services, license_infourl FROM tb_therapist T JOIN tb_authorization A  ON T.fk_authorization_id = A.authorization_id WHERE T.enabled = -1"
    );
    res.status(200).json(requests.rows);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.put("/approve/:id", auth, async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).send("Bad request. Missing id.");
    }
    const therapist_id = parseInt(req.params.id, 10);
    const approved = await pool.query(
      "UPDATE tb_therapist SET enabled = 1,  status = true WHERE therapist_id=$1 RETURNING *",
      [therapist_id]
    );
    res.status(200).json(approved.rows);
    emailService.sendTherapistApprovedEmails(therapist_id);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.put("/decline/:id", auth, async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).send("Bad request. Missing id.");
    }
    const therapist_id = parseInt(req.params.id, 10);
    const denied = await pool.query(
      "UPDATE tb_therapist SET enabled = 0 WHERE therapist_id=$1 RETURNING *",
      [therapist_id]
    );
    const therapistQueryResult = await pool.query(
      "SELECT email FROM tb_authorization WHERE authorization_id = (SELECT fk_authorization_id FROM tb_therapist WHERE therapist_id = $1)",
      [therapist_id]
    );
    res.status(200).json(denied.rows);
    emailService.sendTherapistDeclinedEmail(therapistQueryResult.rows[0].email);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});


router.put("/disable/:id", auth, async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).send("Bad request. Missing id.");
    }
    const therapist_id = parseInt(req.params.id, 10);
    const denied = await pool.query(
      "UPDATE tb_therapist SET enabled = 0 WHERE therapist_id=$1 RETURNING *",
      [therapist_id]
    );
    const therapistQueryResult = await pool.query(
      "SELECT email FROM tb_authorization WHERE authorization_id = (SELECT fk_authorization_id FROM tb_therapist WHERE therapist_id = $1)",
      [therapist_id]
    );
    res.status(200).json(denied.rows);
    emailService.sendTherapistPendingEmail(therapistQueryResult.rows[0].email);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.put("/toggle/:id", auth, async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).send("Bad request. Missing required fields.");
    }
    const therapist_id = parseInt(req.params.id, 10);
    const enabled = parseInt(req.body.enabled);
    const toggled = await pool.query(
      "UPDATE tb_therapist SET enabled = $1 WHERE therapist_id=$2 RETURNING *",
      [enabled, therapist_id]
    );
    const therapistQueryResult = await pool.query(
      "SELECT email FROM tb_authorization WHERE authorization_id = (SELECT fk_authorization_id FROM tb_therapist WHERE therapist_id = $1)",
      [therapist_id]
    );
    res.status(200).json(toggled.rows);
    if (enabled === 1) {
      emailService.sendTherapistEnabledEmail(
        therapistQueryResult.rows[0].email
      );
    } else {
      emailService.sendTherapistDisabledEmail(
        therapistQueryResult.rows[0].email
      );
    }
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

// get therapist endpoint
router.get("/:id", auth, async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).send("Bad request. Missing id.");
    }
    const therapist_id = parseInt(req.params.id, 10);
    const therapist = await pool.query(
      "SELECT * FROM tb_therapist WHERE therapist_id = $1",
      [therapist_id]
    );
    res.status(200).json(therapist.rows);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

// edit therapist endpoint
router.put("/edit/:id", auth, async (req, res) => {
  try {
    const therapist_id = parseInt(req.params.id, 10);
    const isValid = await isValidEditTherapistRequestBody(req.body);
    if (!isValid) {
      return res.status(400).send("Bad request. Invalid request body.");
    }

    const {
      addressL1,
      addressL2,
      city,
      state,
      zipcode,
      profession,
      services,
      summary,
      hourlyRate,
      acceptsHouseCalls,
      licenseUrl,
      acceptsInClinic,
    } = req.body;

    // check if profession, services, summary, hourlyRate, acceptsHouseCalls, licenseUrl, acceptsInClinic has been u

    const updatedTherapist = await pool.query(
      "UPDATE tb_therapist SET street = $1, apartment_no = $2, city = $3, state = $4, zipcode = $5, profession = $6, services = $7, summary = $8, hourly_rate = $9, accepts_house_calls = $10, license_infourl = $11, accepts_in_clinic = $12 WHERE therapist_id = $13 RETURNING *",
      [
        addressL1,
        addressL2,
        city,
        state,
        zipcode,
        profession,
        services,
        summary,
        hourlyRate,
        acceptsHouseCalls,
        licenseUrl,
        acceptsInClinic,
        therapist_id,
      ]
    );
    res.status(200).json(updatedTherapist.rows);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

// edit business hours endpoint
router.put("/edit-hours/:id", auth, async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).send("Bad request. Missing id.");
    }
    const therapist_id = parseInt(req.params.id, 10);
    const { businessHours } = req.body;
    if (!businessHours) {
      return res.status(400).send("Bad request. Missing business hours.");
    }
    // ToDo: validate business hours

    const updatedTherapist = await pool.query(
      "UPDATE tb_therapist SET business_hours = $1 WHERE therapist_id = $2 RETURNING *",
      [businessHours, therapist_id]
    );
    res.status(200).json(updatedTherapist.rows);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

module.exports = router;
