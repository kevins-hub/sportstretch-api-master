const express = require('express');
const router = express.Router();
const config = require('config');
const auth = require('../middleware/auth');

const Pool = require('pg').Pool;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || config.get("connectionString"),
    ssl: {
        rejectUnauthorized: false
    }
}
);

router.put("/:id", auth, async (req, res) => {
    try {
        const bookings_id = parseInt(req.params.id, 10);
        const { starrating } = req.body;
        const rating = await pool.query("UPDATE tb_ratings SET starrating = $1 WHERE fk_bookings_id = $2 RETURNING fk_bookings_id, starrating", [starrating, bookings_id]);
        res.status(200).json({
            bookings_id: rating.rows[0].fk_bookings_id,
            starrating: rating.rows[0].starrating
        });
    } catch (err) {
        console.log(err.message);
    }
});

router.post("/", auth, async (req, res) => {
    try {
        const { bookings_id, therapist_id, starrating } = req.body;
        const newRating = await pool.query("INSERT INTO tb_ratings (fk_bookings_id, fk_therapist_id, starrating) VALUES ($1, $2, $3) ON CONFLICT (fk_bookings_id) DO UPDATE SET starrating = $3", [bookings_id, therapist_id, starrating]);
        res.status(201).send({
            bookings_id: bookings_id,
            starrating: starrating
        });
    } catch (err) {
        console.log(err.message);
    }
});

module.exports = router;