const express = require("express");
const router = express.Router();
const config = require("config");
const bcrypt = require("bcrypt");

const Pool = require("pg").Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

router.post("/athlete", async (req, res) => {
  const { firstName, lastName, email, mobile, password } = req.body;

  let user = await pool.query(
    "SELECT * FROM tb_authorization WHERE email = $1",
    [email]
  );
  if (user.rows[0]) return res.status(400).send("User already registered.");

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);

  user = await pool.query(
    "INSERT INTO tb_authorization (email, password, role) VALUES ($1, $2, $3) RETURNING authorization_id",
    [email, hashed, "athlete"]
  );
  const newAthlete = await pool.query(
    "INSERT INTO tb_athlete (fk_authorization_id, first_name, last_name, mobile) VALUES ($1, $2, $3, $4) RETURNING athlete_id",
    [user.rows[0].authorization_id, firstName, lastName, mobile]
  );

  res.status(200).send({
    firstName: firstName,
    lastName: lastName,
    email: email,
    athlete_id: newAthlete.rows[0].athlete_id,
  });
});

router.post("/therapist", async (req, res) => {
  const {
    fname,
    lname,
    email,
    password,
    phone,
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
    businessHours,
    acceptsInClinic,
    stripeAccountId,
  } = req.body;

  let user = await pool.query(
    "SELECT * FROM tb_authorization WHERE email = $1",
    [email]
  );
  if (user.rows[0]) return res.status(400).send("User already registered.");

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);
  const enabled = -1;
  const status = false;
  const avg_rating = 0.0;

  user = await pool.query(
    "INSERT INTO tb_authorization (email, password, role) VALUES ($1, $2, $3) RETURNING authorization_id",
    [email, hashed, "therapist"]
  );
  const newTherapist = await pool.query(
    "INSERT INTO tb_therapist (fk_authorization_id, first_name, last_name, mobile, apartment_no, street, city, state, zipcode, enabled, status, average_rating, profession, summary, hourly_rate, services, accepts_house_calls, license_infourl, business_hours, accepts_in_clinic, stripe_account_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING therapist_id",
    [
      user.rows[0].authorization_id,
      fname,
      lname,
      phone,
      addressL2,
      addressL1,
      city,
      state,
      zipcode,
      enabled,
      status,
      avg_rating,
      profession,
      summary,
      hourlyRate,
      services,
      acceptsHouseCalls,
      licenseUrl,
      businessHours,
      acceptsInClinic,
      stripeAccountId,
    ]
  );

  res.status(200).send({
    firstName: fname,
    lastName: lname,
    email: email,
    therapist_id: newTherapist.rows[0].therapist_id,
  });
});

// delete account endpoint
// remove from tb_authorization and tb_athlete or tb_therapist
router.delete("/delete/:id", async (req, res) => {
  try {
    const authId = parseInt(req.params.id, 10);
    const user = await pool.query(
      "SELECT role FROM tb_authorization WHERE authorization_id = $1",
      [authId]
    );
    if (user.rows[0].role === "athlete") {
      await pool.query("DELETE FROM tb_athlete WHERE fk_authorization_id = $1", [
        authId,
      ]);
    } else if (user.rows[0].role === "therapist") {
      await pool.query("DELETE FROM tb_therapist WHERE fk_authorization_id = $1", [
        authId,
      ]);
    }
    await pool.query("DELETE FROM tb_authorization WHERE authorization_id = $1", [
      authId,
    ]);
    res.status(200).send("Account deleted.");
  } catch (err) {
    console.log(err.message);
  }
});


module.exports = router;
