const express = require("express");
const router = express.Router();
const config = require("config");
const auth = require("../middleware/auth");
const AWS = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");

const Pool = require("pg").Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

// Configure AWS SDK
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  
  const s3 = new AWS.S3();
  console.warn("s3 = ", s3);
  const bucketName = process.env.S3_BUCKET_NAME;

// Set up multer and multer-s3 to handle file uploads
const upload = multer({
    storage: multerS3({
      s3,
      bucket: bucketName,
      acl: 'public-read',
      key: function (req, file, cb) {
        cb(null, `profile-pictures/${Date.now().toString()}-${file.originalname}`);
      },
    }),
  });

router.post("/profile-picture/:id", upload.single('file'), auth, async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
      }
      const imageUrl = req.file.location;

      // Save imageUrl to your database in tb_authorization associated with the user (not shown)
      const imageUpload = await pool.query(
        "UPDATE tb_authorization SET profile_picture_url = $1 WHERE authorization_id = $2", [imageUrl, req.params.id]
      );

      res.status(201).json({ imageUrl });
    });

module.exports = router;
