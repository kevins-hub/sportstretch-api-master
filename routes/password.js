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
    const { email, newPassword, oldPassword } = req.body;

    let user = await pool.query("SELECT * FROM tb_authorization WHERE email = $1", [email]);
    const authId = user.rows[0].authorization_id;
    const userRole = user.rows[0].role;
    const dbOldPw = user.rows[0].password;
    const pwMatches = await bcrypt.compare(oldPassword, dbOldPw);
    console.warn("pwMatches = ", pwMatches);

    if (!pwMatches) return res.status(400).send('Invalid email or password.');

    const salt = await bcrypt.genSalt(10);
    const newHashed = await bcrypt.hash(newPassword, salt);
    
    if (userRole === 'athlete') {
        const athlete = await pool.query("UPDATE tb_authorization SET password = $1 WHERE authorization_id = $2", [newHashed, authId]);
        return res.status(200).json({
            status: "success"
        })
    }
    
    if (userRole === 'therapist') {
        const therapist = await pool.query("UPDATE tb_authorization SET password = $1 WHERE authorization_id = $2", [newHashed, authId]);
        return res.status(200).json({
            status: "success"
        })
    }
    return res.status(400).send('Bad request.');
});

module.exports = router;