const express = require("express");
const router = express.Router();
const config = require("config");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const Pool = require("pg").Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

router.post("/", async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await pool.query(
      "SELECT password, role, authorization_id FROM tb_authorization WHERE email = $1",
      [email]
    );
    if (!user.rows[0])
      return res.status(400).send("Invalid email or password.");

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword)
      return res.status(400).send("Invalid email or password.");

    let userObj = null;
    if (user.rows[0].role === "athlete") {
      const athlete = await pool.query(
        "SELECT athlete_id, first_name, last_name, mobile FROM tb_athlete WHERE fk_authorization_id = $1",
        [user.rows[0].authorization_id]
      );
      userObj = {
        athlete_id: athlete.rows[0].athlete_id,
        first_name: athlete.rows[0].first_name,
        last_name: athlete.rows[0].last_name,
        mobile: athlete.rows[0].mobile,
      };
    } else if (user.rows[0].role === "therapist") {
      const therapist = await pool.query(
        "SELECT therapist_id, first_name, last_name, mobile, city, state, enabled, status, average_rating, street, apartment_no, zipcode, license_infourl, profession, summary, hourly_rate, services, accepts_house_calls, business_hours, accepts_in_clinic FROM tb_therapist WHERE fk_authorization_id = $1",
        [user.rows[0].authorization_id]
      );
      userObj = {
        therapist_id: therapist.rows[0].therapist_id,
        first_name: therapist.rows[0].first_name,
        last_name: therapist.rows[0].last_name,
        mobile: therapist.rows[0].mobile,
        street: therapist.rows[0].street,
        apartment_no: therapist.rows[0].apartment_no,
        city: therapist.rows[0].city,
        state: therapist.rows[0].state,
        zipcode: therapist.rows[0].zipcode,
        enabled: therapist.rows[0].enabled,
        status: therapist.rows[0].status,
        avg_rating: therapist.rows[0].average_rating,
        profession: therapist.rows[0].profession,
        summary: therapist.rows[0].summary,
        hourly_rate: therapist.rows[0].hourly_rate,
        services: therapist.rows[0].services,
        license_infourl: therapist.rows[0].license_infourl,
        accepts_house_calls: therapist.rows[0].accepts_house_calls,
        business_hours: therapist.rows[0].business_hours,
        accepts_in_clinic: therapist.rows[0].accepts_in_clinic,
      };
    } else if (user.rows[0].role === "admin") {
      const athlete = await pool.query(
        "SELECT athlete_id, first_name, last_name, mobile FROM tb_athlete WHERE fk_authorization_id = $1",
        [user.rows[0].authorization_id]
      );
      userObj = {
        admin_id: athlete.rows[0].athlete_id,
        first_name: athlete.rows[0].first_name,
        last_name: athlete.rows[0].last_name,
        mobile: athlete.rows[0].mobile,
      };
    }

    const authResObj = {
      role: user.rows[0].role,
      authorization_id: user.rows[0].authorization_id,
      userObj: userObj,
    };

    const token = jwt.sign(
      authResObj,
      process.env.jwtPrivateKey || config.get("jwtPrivateKey")
    );
    res.status(200).send(token);
  } catch (err) {
    return res.status(500).send(`Internal Server Error: ${err}`);
  }
});

router.post("/refreshUser/:authId", async (req, res) => {
  try {
    const authId = req.params.authId;
    let user = await pool.query(
      "SELECT role FROM tb_authorization WHERE authorization_id = $1",
      [authId]
    );
    if (!user.rows[0]) return res.status(400).send("Invalid authorization id.");

    let userObj = null;
    if (user.rows[0].role === "athlete") {
      const athlete = await pool.query(
        "SELECT athlete_id, first_name, last_name, mobile FROM tb_athlete WHERE fk_authorization_id = $1",
        [authId]
      );
      userObj = {
        athlete_id: athlete.rows[0].athlete_id,
        first_name: athlete.rows[0].first_name,
        last_name: athlete.rows[0].last_name,
        mobile: athlete.rows[0].mobile,
      };
    } else if (user.rows[0].role === "therapist") {
      const therapist = await pool.query(
        "SELECT therapist_id, first_name, last_name, mobile, city, state, enabled, status, average_rating, street, apartment_no, zipcode, license_infourl, profession, summary, hourly_rate, services, accepts_house_calls, business_hours, accepts_in_clinic FROM tb_therapist WHERE fk_authorization_id = $1",
        [authId]
      );
      userObj = {
        therapist_id: therapist.rows[0].therapist_id,
        first_name: therapist.rows[0].first_name,
        last_name: therapist.rows[0].last_name,
        mobile: therapist.rows[0].mobile,
        street: therapist.rows[0].street,
        apartment_no: therapist.rows[0].apartment_no,
        city: therapist.rows[0].city,
        state: therapist.rows[0].state,
        zipcode: therapist.rows[0].zipcode,
        enabled: therapist.rows[0].enabled,
        status: therapist.rows[0].status,
        avg_rating: therapist.rows[0].average_rating,
        profession: therapist.rows[0].profession,
        summary: therapist.rows[0].summary,
        hourly_rate: therapist.rows[0].hourly_rate,
        services: therapist.rows[0].services,
        license_infourl: therapist.rows[0].license_infourl,
        accepts_house_calls: therapist.rows[0].accepts_house_calls,
        business_hours: therapist.rows[0].business_hours,
        accepts_in_clinic: therapist.rows[0].accepts_in_clinic,
      };

      const authResObj = {
        role: user.rows[0].role,
        authorization_id: user.rows[0].authorization_id,
        userObj: userObj,
      };

      const token = jwt.sign(
        authResObj,
        process.env.jwtPrivateKey || config.get("jwtPrivateKey")
      );
      res.status(200).send(token);
    }
  } catch (err) {
    return res.status(500).send(`Internal Server Error: ${err}`);
  }
});


// check email available endpoint
router.post("/checkEmail", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await pool.query(
      "SELECT email FROM tb_authorization WHERE email = $1",
      [email]
    );
    if (user.rows[0]) return res.status(400).send("Email already registered.");
    res.status(200).send("Email is available.");
  } catch (err) {
    return res.status(500).send(`Internal Server Error: ${err}`);
  }
});

module.exports = router;
