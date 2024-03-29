const express = require("express");
const router = express.Router();
const config = require("config");
const auth = require("../middleware/auth");

const us_states = require("../constants/us_states");

const Pool = require("pg").Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

router.get("/all", auth, async (req, res) => {
  try {
    const allTherapists = await pool.query(
      "SELECT first_name, last_name, mobile, city, state, enabled, average_rating, therapist_id, email FROM tb_therapist T JOIN tb_authorization A  ON T.fk_authorization_id = A.authorization_id WHERE T.enabled != -1"
    );
    res.status(200).json(allTherapists.rows);
  } catch (err) {
    console.log(err.message);
  }
});

router.get("/enabled/online", auth, async (req, res) => {
  try {
    const state = req.query.state;
    if (state) {
      const stateName = us_states[state];
      const therapists = await pool.query(
        "SELECT * FROM tb_therapist WHERE enabled = 1 and status = true and state = $1",
        [stateName]
      );
      res.status(200).json(therapists.rows);
    } else {
      const therapists = await pool.query(
        "SELECT * FROM tb_therapist WHERE enabled = 1 and status = true"
      );
      res.status(200).json(therapists.rows);
    }
  } catch (err) {
    console.log(err.message);
  }
});

router.get("/states", auth, async (req, res) => {
  try {
    const states = await pool.query(
      "SELECT DISTINCT state FROM tb_therapist WHERE enabled = 1 and status = true"
    );
    res.status(200).json(states.rows);
  } catch (err) {
    console.log(err.message);
  }
});

router.put("/setAvailability/:id", auth, async (req, res) => {
  try {
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
    console.log(err.message);
  }
});

router.get("/requests", auth, async (req, res) => {
  try {
    const requests = await pool.query(
      "SELECT first_name, last_name, mobile, email, therapist_id FROM tb_therapist T JOIN tb_authorization A  ON T.fk_authorization_id = A.authorization_id WHERE T.enabled = -1"
    );
    res.status(200).json(requests.rows);
  } catch (err) {
    console.log(err.message);
  }
});

router.put("/approve/:id", auth, async (req, res) => {
  try {
    const therapist_id = parseInt(req.params.id, 10);
    const approved = await pool.query(
      "UPDATE tb_therapist SET enabled = 1 and status = true WHERE therapist_id=$1 RETURNING *",
      [therapist_id]
    );
    res.status(200).json(approved.rows);
  } catch (err) {
    console.log(err.message);
  }
});

router.put("/disable/:id", auth, async (req, res) => {
  try {
    const therapist_id = parseInt(req.params.id, 10);
    const denied = await pool.query(
      "UPDATE tb_therapist SET enabled = 0 WHERE therapist_id=$1 RETURNING *",
      [therapist_id]
    );
    res.status(200).json(denied.rows);
  } catch (err) {
    console.log(err.message);
  }
});

router.put("/toggle/:id", auth, async (req, res) => {
  try {
    const therapist_id = parseInt(req.params.id, 10);
    const enabled = parseInt(req.body.enabled);
    const toggled = await pool.query(
      "UPDATE tb_therapist SET enabled = $1 WHERE therapist_id=$2 RETURNING *",
      [enabled, therapist_id]
    );
    res.status(200).json(toggled.rows);
  } catch (err) {
    console.log(err.message);
  }
});

router.put("/toggle/:id", auth, async (req, res) => {
  try {
    const therapist_id = parseInt(req.params.id, 10);
    const enabled = parseInt(req.body.enabled);
    const toggled = await pool.query(
      "UPDATE tb_therapist SET enabled = $1 WHERE therapist_id=$2 RETURNING *",
      [enabled, therapist_id]
    );
    res.status(200).json(toggled.rows);
  } catch (err) {
    console.log(err.message);
  }
});

// get therapist endpoint
router.get("/:id", auth, async (req, res) => {
  try {
    const therapist_id = parseInt(req.params.id, 10);
    const therapist = await pool.query(
      "SELECT * FROM tb_therapist WHERE therapist_id = $1",
      [therapist_id]
    );
    res.status(200).json(therapist.rows);
  } catch (err) {
    console.log(err.message);
  }
});


// edit therapist endpoint
router.put("/edit/:id", auth, async (req, res) => {
  try {
    const therapist_id = parseInt(req.params.id, 10);
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
    } = req.body;

    const updatedTherapist = await pool.query(
      "UPDATE tb_therapist SET street = $1, apartment_no = $2, city = $3, state = $4, zipcode = $5, profession = $6, services = $7, summary = $8, hourly_rate = $9, accepts_house_calls = $10, license_infourl = $11 WHERE therapist_id = $12 RETURNING *",
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
        therapist_id,
      ]
    );
    res.status(200).json(updatedTherapist.rows);
  } catch (err) {
    console.log(err.message);
  }
});

// edit business hours endpoint
router.put("/edit-hours/:id", auth, async (req, res) => {
  try {
    const therapist_id = parseInt(req.params.id, 10);
    const { business_hours } = req.body;

    const updatedTherapist = await pool.query(
      "UPDATE tb_therapist SET business_hours = $1 WHERE therapist_id = $2 RETURNING *",
      [business_hours, therapist_id]
    );
    res.status(200).json(updatedTherapist.rows);
  } catch (err) {
    console.log(err.message);
  }
});

module.exports = router;
