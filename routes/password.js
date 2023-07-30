const express = require('express');
const router = express.Router();
const config = require('config');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const Pool = require('pg').Pool;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || config.get("connectionString"),
    ssl: {
        rejectUnauthorized: false
    }
}
);

const generateToken = () => {
    // creates 5 digit token
    return Math.random().toString(7).slice(2);
}

router.put("/change-password", async (req, res) => {
    const { email, newPassword, oldPassword } = req.body;

    let user = await pool.query("SELECT * FROM tb_authorization WHERE email = $1", [email]);
    const authId = user.rows[0].authorization_id;
    const userRole = user.rows[0].role;
    const dbOldPw = user.rows[0].password;
    const pwMatches = await bcrypt.compare(oldPassword, dbOldPw);

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

router.put("/reset-auth", async (req, res) => {

    const { resetToken, authId } = req.body;
    let user = await pool.query("SELECT * FROM tb_authorization WHERE authorization_id = $1", [authId]);
    const resetTokenDb = user.rows[0].pw_reset_token;
    if (resetToken !== resetTokenDb) return res.status(400).send("Not authorized to reset password.");
    const dateNow = new Date();
    const pwExpDate = new Date(user.rows[0].pw_reset_expiration);
    if ( dateNow > pwExpDate) return res.status(400).send("Reset token has expired. Please try your request again.");

    const clearToken = await pool.query("UPDATE tb_authorization SET pw_reset_token=null, pw_reset_expiration=null WHERE authorization_id = $1", [authId]);

    return res.status(200).json({
        status: "success"
    })
});

router.put("/reset-password", async (req, res) => {
    const { newPassword, authId } = req.body;
    const salt = await bcrypt.genSalt(10);
    const newHashed = await bcrypt.hash(newPassword, salt);
    const updatePw = await pool.query("UPDATE tb_authorization SET password = $1 WHERE authorization_id = $2", [newHashed, authId]);
    return res.status(200).json({
        status: "success"
    })
});

router.put("/forgot-password", async (req, res) => {

    const { email } = req.body;

    let user = await pool.query("SELECT * FROM tb_authorization WHERE email = $1", [email]);
    if (user.rows.length === 0) return res.status(400).send("An account with this email does not exist. Please try again.");
    const authId = user.rows[0].authorization_id;
    const tokenValidDuration  = 5;
    let expiration = new Date();
    expiration = expiration.setMinutes(expiration.getMinutes() + tokenValidDuration);
    const resetToken = generateToken();

    // set reset token to user's entry in db
    await pool.query("UPDATE tb_authorization SET pw_reset_token = $1 WHERE authorization_id = $2", [resetToken, authId]);
    await pool.query("UPDATE tb_authorization SET pw_reset_expiration = $1 WHERE authorization_id = $2", [expiration, authId]);

    // send token via email / text

    return res.status(200).json({
        status: "success"
    })
});

module.exports = router;