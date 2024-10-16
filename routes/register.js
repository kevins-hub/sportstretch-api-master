const express = require("express");
const router = express.Router();
const config = require("config");
const bcrypt = require("bcrypt");
const emailService = require("../utilities/email.js");

const Pool = require("pg").Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

const isValidRegisterTherapistRequestBody = async (body) => {
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
  } = body;

  if (
    !fname ||
    !lname ||
    !email ||
    !password ||
    !phone ||
    !addressL1 ||
    !city ||
    !state ||
    !zipcode ||
    !profession ||
    !services ||
    !summary ||
    !hourlyRate ||
    !licenseUrl ||
    !businessHours ||
    !stripeAccountId
  ) {
    return false;
  }

  // validate valid phone number with regex
  const phoneRegex = /^[0-9]{10}$/;
  if (!phone.match(phoneRegex)) {
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

  const nameRegex = /^[a-zA-Z\s]*$/;
  if (!fname.match(nameRegex) || !lname.match(nameRegex)) {
    return false;
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email.match(emailRegex)) {
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

  // not working?
  const urlRegex = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[a-zA-Z0-9#-_.?&=]*)*\/?$/;
  if (!licenseUrl.match(urlRegex)) {
    return false;
  }

  return true;
}

router.post("/athlete", async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, password } = req.body;

    if (!firstName || !lastName || !email || !mobile || !password) {
      return res.status(400).send("Bad request.");
    }

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
    emailService.sendAthleteWelcomeEmail(newAthlete.rows[0].athlete_id);
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.post("/therapist", async (req, res) => {
  try {
    const isValid = await isValidRegisterTherapistRequestBody(req.body);
    if (!isValid) {
      return res.status(400).send("Bad request. Invalid request body.");
    }
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
    emailService.sendTherapistWelcomeEmail(newTherapist.rows[0].therapist_id);
    emailService.sendTherapistRegisteredEmailToAdmin(newTherapist.rows[0].therapist_id);
    res.status(200).send({
      firstName: fname,
      lastName: lname,
      email: email,
      therapist_id: newTherapist.rows[0].therapist_id,
    });

  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
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
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.put("/verify-email", async (req, res) => {
  try {
    const { email, token } = req.body;
    if (!email) {
      return res.status(400).send("Bad request.");
    }
    const user = await pool.query(
      "SELECT * FROM tb_authorization WHERE email = $1",
      [email]
    );
    if (user.rows[0]) {
      return res.status(400).send("Email already registered.");
    }
    emailService.sendVerificationEmail(email, token);
    res.status(200).send("Email verification sent.");
  } catch (err) {
    res.status(500).send(`Internal Server Error: ${err}`);
  }
});


module.exports = router;
