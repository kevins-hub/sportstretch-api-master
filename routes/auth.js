const express = require('express');
const router = express.Router();
const config = require('config');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Pool = require('pg').Pool;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || config.get("connectionString"),
    ssl: {
        rejectUnauthorized: false
    }
}
);

router.post("/", async (req, res) => {
    const { email, password } = req.body;
    
    let user = await pool.query("SELECT password, role, authorization_id FROM tb_authorization WHERE email = $1", [email]);
    if (!user.rows[0]) return res.status(400).send('Invalid email or password.');

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) return res.status(400).send('Invalid email or password.');

    let userObj = null;
    if (user.rows[0].role === "athlete") {
        const athlete = await pool.query("SELECT athlete_id, first_name, last_name, mobile FROM tb_athlete WHERE fk_authorization_id = $1", [user.rows[0].authorization_id]);
        userObj = {
            athlete_id : athlete.rows[0].athlete_id,
            first_name : athlete.rows[0].first_name,
            last_name : athlete.rows[0].last_name,
            mobile: athlete.rows[0].mobile
        }
    }
    else if (user.rows[0].role === "therapist") {
        const therapist = await pool.query("SELECT therapist_id, first_name, last_name, mobile, city, state, enabled, status, average_rating FROM tb_therapist WHERE fk_authorization_id = $1", [user.rows[0].authorization_id]);
        userObj = {
            therapist_id : therapist.rows[0].therapist_id,
            first_name : therapist.rows[0].first_name,
            last_name : therapist.rows[0].last_name,
            mobile: therapist.rows[0].mobile,
            city: therapist.rows[0].city,
            state: therapist.rows[0].state,
            enabled: therapist.rows[0].enabled,
            status: therapist.rows[0].status,
            avg_rating: therapist.rows[0].average_rating
        }
    }
    else if (user.rows[0].role === "admin") {
        const athlete = await pool.query("SELECT athlete_id, first_name, last_name, mobile FROM tb_athlete WHERE fk_authorization_id = $1", [user.rows[0].authorization_id]);
        userObj = {
            admin_id : athlete.rows[0].athlete_id,
            first_name : athlete.rows[0].first_name,
            last_name : athlete.rows[0].last_name,
            mobile: athlete.rows[0].mobile
        }
    }

    const authResObj = {
        role : user.rows[0].role,
        authorization_id: user.rows[0].authorization_id,
        userObj: userObj
    }

    const token = jwt.sign(authResObj, process.env.jwtPrivateKey || config.get("jwtPrivateKey"));
    res.status(200).send(token);
});

router.put("/change-password", async (req, res) => {
    const { email, newPassword, oldPassword } = req.body;

    let user = await pool.query("SELECT * FROM tb_authorization WHERE email = $1", [email]);
    console.warn("user.rows[0] = ", user.rows[0]);
    const authId = user.rows[0].authorization_id;
    const userRole = user.rows[0].role;
    const dbOldPw = user.rows[0].password;
    //const pwMatches = await bcrypt.compare(oldPassword, dbOldPw);
    

    //if (!pwMatches) return res.status(400).send('Invalid email or password.');

    const salt = await bcrypt.genSalt(10);
    const newHashed = await bcrypt.hash(newPassword, salt);
    

    if (userRole === 'athlete') {
        const athlete = await pool.query("UPDATE tb_athlete SET password = $1 WHERE authId = $2", [newHashed, authId]);
        console.warn("athlete = ", athlete);
        return res.status(200).json({
            email: athelete.rows[0].email,
            status: "success"
        })
    }
    
    if (userRole === 'therapist') {
        const therapist = await pool.query("UPDATE tb_therapist SET password = $1 WHERE authId = $2", [newHashed, authId]);
        console.warn("therapist = ", thereapist);
        return res.status(200).json({
            email: therapist.rows[0].email,
            status: "success"
        })
    }
    console.warn("BADD REQUEST");
    console.warn("userRolee = ", userRole);
    return res.status(400).send('Bad request.');
});

module.exports = router;