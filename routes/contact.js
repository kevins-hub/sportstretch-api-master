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

const isValidAthleteEditContactRequestBody = async (body) => {
  const { authId, email, phone } = body;
  if (!email || !phone || !authId) {
    return false;
  }

  if (isNaN(authId)) {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.match(emailRegex)) {
    return false;
  }

  // check if email already exists
  const user = await pool.query(
    "SELECT * FROM tb_authorization WHERE email = $1",
    [email]
  );
  if (user.rows.length > 0 && user.rows[0].authorization_id !== authId) {
    return false;
  }

  // validate valid phone number with regex
  const phoneRegex = /^[0-9]{10}$/;
  if (!phone.match(phoneRegex)) {
    return false;
  }

  return true;
}

const isValidTherapistEditContactRequestBody = async (body) => {
  const { authId, email, phone, addressL1, addressL2, city, state, zipcode } = body;

  if (!email || !phone || !addressL1 || !city || !state || !zipcode || !authId) {
    return false;
  }

  if (isNaN(authId)) {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.match(emailRegex)) {
    return false;
  }

  // check if email already exists
  const user = await pool.query(
    "SELECT * FROM tb_authorization WHERE email = $1",
    [email]
  );
  if (user.rows.length > 0 && user.rows[0].authorization_id !== authId) {
    return false;
  }

  // validate valid phone number with regex
  const phoneRegex = /^[0-9]{10}$/;
  if (!phone.match(phoneRegex)) {
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

  return true;
}


// edit contact info
router.put("/edit-contact", async (req, res) => {
  const { authId, email, phone, addressL1, addressL2, city, state, zipcode } =
    req.body;

  let user = await pool.query(
    "SELECT * FROM tb_authorization WHERE authorization_id = $1",
    [authId]
  );
  const userRole = user.rows[0].role;

  if (userRole === "athlete") {
    const isValid = await isValidAthleteEditContactRequestBody(req.body);
    if (!isValid) {
      return res.status(400).send("Bad request. Invalid request body.");
    }
    const emailUpdate = await pool.query(
      "UPDATE tb_authorization SET email = $1 WHERE authorization_id = $2",
      [email, authId]
    );
    const athlete = await pool.query(
      "UPDATE tb_athlete SET mobile = $1 WHERE fk_authorization_id = $2",
      [phone, authId]
    );
    return res.status(200).json({
      status: "success",
    });
  }

  if (userRole === "therapist") {
    const isValid = await isValidTherapistEditContactRequestBody(req.body);
    if (!isValid) {
      return res.status(400).send("Bad request. Invalid request body.");
    }
    const emailUpdate = await pool.query(
      "UPDATE tb_authorization SET email = $1 WHERE authorization_id = $2",
      [email, authId]
    );
    const therapist = await pool.query(
      "UPDATE tb_therapist SET mobile = $1, apartment_no = $2, street = $3, city = $4, state = $5, zipcode = $6 WHERE fk_authorization_id = $7",
      [phone, addressL2, addressL1, city, state, zipcode, authId]
    );
    return res.status(200).json({
      status: "success",
    });
  }
  return res.status(400).send("Bad request.");
});

// get contact info
router.get("/get-contact/:id", async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Bad request. Missing id.");
  }
  const authId = req.params.id;
  try {
    let user = await pool.query(
      "SELECT * FROM tb_authorization WHERE authorization_id = $1",
      [authId]
    );
    const userRole = user.rows[0].role;
    let contactInfo = null;
    if (userRole === "athlete") {
      contactInfo = await pool.query(
        "SELECT email, mobile FROM tb_authorization A JOIN tb_athlete B ON A.authorization_id = B.fk_authorization_id WHERE authorization_id = $1",
        [authId]
      );
      if (!contactInfo.rows || contactInfo.rows.length === 0) {
        return res.status(400).send("User not found.");
      }
      return res.status(200).json(contactInfo.rows[0]);
    }
    if (userRole === "therapist") {
      contactInfo = await pool.query(
        "SELECT email, mobile, apartment_no, street, city, state, zipcode FROM tb_authorization A JOIN tb_therapist B ON A.authorization_id = B.fk_authorization_id WHERE authorization_id = $1",
        [authId]
      );
      if (!contactInfo.rows || contactInfo.rows.length === 0) {
        return res.status(400).send("User not found.");
      }
      return res.status(200).json(contactInfo.rows[0]);
    }
    return res.status(400).send("Bad request.");
  } catch (err) {
    return res.status(500).send(`Internal Server Error: ${err}`);
  }

});

module.exports = router;
