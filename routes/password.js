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

router.put("/change-password", async (req, res) => {
    console.warn("CHANGE PASSWORD ENDPT");
    const { email, newPassword, oldPassword } = req.body;

    let user = await pool.query("SELECT * FROM tb_authorization WHERE email = $1", [email]);
    console.warn("user.rows[0] = ", user.rows[0]);
    const authId = user.rows[0].authorization_id;
    const userRole = user.rows[0].role;
    const dbOldPw = user.rows[0].password;
    //const pwMatches = await bcrypt.compare(oldPassword, dbOldPw);
    
    console.warn("apiResultFields = ");
    console.warn("authId = ", authId);
    console.warn("userRole = ", userRole);
    console.warn("dbOldPw = ", dbOldPw);
    

    //if (!pwMatches) return res.status(400).send('Invalid email or password.');

    const salt = await bcrypt.genSalt(10);
    const newHashed = await bcrypt.hash(newPassword, salt);

    console.warn("salt = ", salt);
    console.warn("newHashed = ", newHashed);
    

    if (userRole === 'athlete') {
        console.warn("athleteFlow");
        const athlete = await pool.query("UPDATE tb_athlete SET password = $1 WHERE authorization_id = $2", [newHashed, authId]);
        console.warn("athlete = ", athlete);
        return res.status(200).json({
            email: athelete.rows[0].email,
            status: "success"
        })
    }
    
    if (userRole === 'therapist') {
        console.warn("therapistFlow");
        const therapist = await pool.query("UPDATE tb_therapist SET password = $1 WHERE authorization_id = $2", [newHashed, authId]);
        console.warn("therapist = ", therapist);
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