const express = require("express");
const router = express.Router();
const config = require("config");
const auth = require("../middleware/auth");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

const Pool = require("pg").Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

// Configure AWS SDK

let s3Client;

try {
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  console.log("AWS SDK configured successfully.");
} catch (error) {
  console.error("Error configuring AWS SDK: ", error);
}

const bucketName = process.env.S3_BUCKET_NAME;

// Set up multer and multer-s3 to handle file uploads
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: bucketName,
    acl: "public-read",
    // contentType: multerS3.AUTO_CONTENT_TYPE,
    contentType: function (req, file, cb) {
      // Manually set the content type based on the file type
      const mimeTypes = {
        "image/jpeg": "image/jpeg",
        "image/png": "image/png",
        // Add other MIME types if needed
      };
      const contentType =
        mimeTypes[file.mimetype] || "application/octet-stream";
      cb(null, contentType);
    },
    key: function (req, file, cb) {
      console.warn("file = ", file);
      cb(
        null,
        `profile-pictures/${Date.now().toString()}-${file.originalname}`
      );
    },
  }),
});

router.post(
  "/profile-picture/:id",
  upload.single("file"),
  auth,
  async (req, res) => {
    if (!req.params.id) {
      return res.status(400).send("Bad request. Missing id.");
    }
    const authId = req.params.id;
    if (!req.file) {
      return res.status(400).send("Bad request. No file uploaded.");
    }
    const imageUrl = req.file.location;

    // Save imageUrl to your database in tb_authorization associated with the user (not shown)
    try {
      const imageUpload = await pool.query(
        "UPDATE tb_authorization SET profile_picture_url = $1 WHERE authorization_id = $2",
        [imageUrl, authId]
      );
      res.status(201).json({ imageUrl });
    } catch (err) {
      console.error("Database update error:", error);
      res.status(500).send("Error updating database.");
    }
  }
);

//delete profile picture
router.delete("/profile-picture/:id", auth, async (req, res) => {
  const authId = req.params.id;
  if (!authId) {
    return res.status(400).send("Bad request. Missing id.");
  }

  try {
    // Get the current profile picture URL from the database
    const result = await pool.query(
      "SELECT profile_picture_url FROM tb_authorization WHERE authorization_id = $1",
      [authId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Profile picture not found.");
    }

    const imageUrl = result.rows[0].profile_picture_url;

    // imageUrl format: https://sportstretch-dev-uploads.s3.us-west-1.amazonaws.com/profile-pictures/1750301396438-file.jpg

    // Delete the image from S3
    const key = imageUrl.split("/").slice(-2).join("/"); // Extract the key from the URL
    const deleteParams = {
      Bucket: bucketName,
      Key: key,
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));

    // Update the database to remove the profile picture URL
    await pool.query(
      "UPDATE tb_authorization SET profile_picture_url = NULL WHERE authorization_id = $1",
      [authId]
    );

    res.status(200).send("Profile picture deleted successfully.");
  } catch (error) {
    console.error("Error deleting profile picture:", error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
