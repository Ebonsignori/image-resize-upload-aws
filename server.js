/* eslint-disable no-console */
require("dotenv").config();
const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const Handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const AWS = require("aws-sdk");

const uploadPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}
const upload = multer({ dest: uploadPath });

const { PORT, IMAGE_BREAKPOINTS, AWS_ID, AWS_SECRET, BUCKET_NAME } =
  process.env;
let { IMAGE_QUALITY } = process.env;

const app = express();
app.use(express.static(path.join(__dirname, "client")));
const PORT_CONFIG = PORT || 3000;

// Validate env config
if (!IMAGE_BREAKPOINTS) {
  console.log("Please set IMAGE_BREAKPOINTS in .env");
  process.exit(0);
}
if (!AWS_ID) {
  console.log("Please set your AWS_ID in .env");
  process.exit(0);
}
if (!AWS_SECRET) {
  console.log("Please set your AWS_SECRET in .env");
  process.exit(0);
}
if (!BUCKET_NAME) {
  console.log("Please set your BUCKET_NAME in .env");
  process.exit(0);
}
if (!IMAGE_QUALITY) {
  console.log("IMAGE_QUALITY not set in .env, defaulting to 90%");
  IMAGE_QUALITY = "90";
}

console.log("Setting image quality to ", IMAGE_QUALITY);

const s3 = new AWS.S3({
  accessKeyId: AWS_ID,
  secretAccessKey: AWS_SECRET,
});

const BREAKPOINTS = IMAGE_BREAKPOINTS.split(",").map((breakpointStr) =>
  parseInt(breakpointStr.trim(), 10)
);

const pageTemplate = Handlebars.compile(
  fs.readFileSync(path.join(__dirname, "client", "index.handlebars"), "utf8")
);

app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send(
    pageTemplate({
      breakpoints: BREAKPOINTS,
      imageQuality: IMAGE_QUALITY,
    })
  );
});

app.post("/upload", upload.single("photo"), async (req, res) => {
  if (!req.file) {
    console.log("Invalid upload sent to server.");
    return res.redirect(`/?error=${encodeURI("Upload to server failed")}`);
  }
  const isImage = req.file.mimetype.includes("image");
  if (!isImage) {
    return res.redirect(`/?error=${encodeURI("Not an image file")}`);
  }
  if (req.body["image-quality"]) {
    IMAGE_QUALITY = parseInt(req.body["image-quality"], 10);
  }

  const imageName = req.body.ImageName;
  console.log(`Received image ${imageName}.`);

  // Create directory to save the files in for AWS upload
  const imageDirectory = path.join(uploadPath, req.file.originalname);
  fs.mkdirSync(imageDirectory, { recursive: true });

  console.log("Resizing and uploading...");
  const uploadUrls = [];
  const uploadPromises = [...BREAKPOINTS, "original"].map(
    async (breakpoint) => {
      const isOriginal = breakpoint === "original";
      const imagePattern = `${imageName}-${breakpoint}.webp`;
      const originalPattern = `${imageName}-${breakpoint}.jpg`;
      const imageKey = `${imageName}/${imagePattern}`;
      const imagePath = path.join(imageDirectory, imagePattern);
      const originalPath = path.join(imageDirectory, originalPattern);
      const existsInS3 = await s3
        .headObject({
          Bucket: BUCKET_NAME,
          Key: imageKey,
        })
        .promise()
        // eslint-disable-next-line github/no-then
        .then(
          () => true,
          (err) => {
            if (err.code === "NotFound") {
              return false;
            }
            throw err;
          }
        );

      if (existsInS3) {
        const errorMsg = `Image with name ${imageName} already exists in S3.`;
        throw errorMsg;
      }

      try {
        if (isOriginal) {
          await sharp(req.file.path)
            .withMetadata()
            .jpeg({ quality: 100 })
            .toFile(originalPath);
        } else {
          await sharp(req.file.path)
            .resize(breakpoint)
            .webp({ quality: parseInt(IMAGE_QUALITY, 10) })
            .toFile(imagePath);
        }
        const imageBuffer = fs.readFileSync(imagePath);
        const uploadRes = await s3
          .upload({
            Bucket: BUCKET_NAME,
            Key: imageKey,
            Body: imageBuffer,
            ContentType: "image/webp",
            ContentLanguage: "en-US",
            ACL: "public-read",
            // Cache "indefinetly"
            CacheControl: "max-age: 31536000, immutable",
            Metadata: {
              ...req.body,
              originalname: req.file.originalname,
            },
          })
          .promise();
        uploadUrls.push(uploadRes.Location);
      } catch (error) {
        console.log(error);
        const errorMsg = `Error resizing image to size ${breakpoint}`;
        throw errorMsg;
      }
      console.log(`Resized ${imageKey} uploaded to S3.`);
    }
  );

  try {
    await Promise.all(uploadPromises);
  } catch (error) {
    console.log(error);
    return res.redirect(`/?error=${encodeURI(error)}`);
  }

  console.log("Upload complete. Removing image files from disk...");
  fs.rmdirSync(uploadPath, { recursive: true });
  fs.mkdirSync(uploadPath);
  console.log("Done.");

  return res.redirect(
    `/?result=${encodeURI(
      `${req.file.originalname} resized and uploaded successfully!`
    )}&imageUrls=${encodeURI(JSON.stringify(uploadUrls))}`
  );
});

app.listen(PORT_CONFIG, () => {
  console.log(`Listening at localhost:${PORT_CONFIG}`);
});
