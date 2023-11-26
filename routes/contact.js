const express = require('express');
const router = express.Router();
const config = require('config');
const bcrypt = require('bcrypt');

const Pool = require('pg').Pool;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || config.get("connectionString"),
    ssl: {
        rejectUnauthorized: false
    }
}
);

// edit contact info
router.put("/edit-contact", async (req, res) => {
        const { authId, email, phone, addressL1, addressL2, city, state, zipcode } = req.body;
    
        let user = await pool.query("SELECT * FROM tb_authorization WHERE authorization_id = $1", [authId]);
        const userRole = user.rows[0].role;

    
        if (userRole === 'athlete') {
            const emailUpdate = await pool.query("UPDATE tb_authorization SET email = $1 WHERE authorization_id = $2", [email, authId]);
            const athlete = await pool.query("UPDATE tb_athlete SET mobile = $1 WHERE fk_authorization_id = $2", [phone, authId]);
            return res.status(200).json({
                status: "success"
            })
        }
    
        if (userRole === 'therapist') {
            const emailUpdate = await pool.query("UPDATE tb_authorization SET email = $1 WHERE authorization_id = $2", [email, authId]);
            const therapist = await pool.query("UPDATE tb_therapist SET mobile = $1, apartment_no = $2, street = $3, city = $4, state = $5, zipcode = $6 WHERE fk_authorization_id = $7", [phone, addressL2, addressL1, city, state, zipcode, authId]);
            return res.status(200).json({
                status: "success"
            })
        }
        return res.status(400).send('Bad request.');
});

module.exports = router;