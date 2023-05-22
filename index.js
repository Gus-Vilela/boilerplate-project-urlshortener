require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const { nanoid } = require("nanoid");
let bodyParser = require("body-parser");
const dns = require("dns");
mongoose.connect(process.env.MONGO_URI);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

const urlSchema = new mongoose.Schema({
  originalUrl: String,
  shortUrl: {
    type: String,
    default: () => nanoid(12),
    unique: true,
  },
});

const Url = mongoose.model("Url", urlSchema);
app.use(bodyParser.urlencoded({ extended: false }));

// Middleware to verify URL
function verifyUrl(req, res, next) {
  const originalUrl = req.body.url;
  console.log(originalUrl);

  if (!originalUrl) {
    return res.status(400).json({ error: "URL is required" });
  }

  const hostname = new URL(originalUrl).hostname;
  dns.lookup(hostname, (err) => {
    if (err) {
      return res.json({ error: "invalid url" });
    }
    next();
  });
}

// API routes
app.post("/api/shorturl", verifyUrl, async (req, res) => {
  const originalUrl = req.body.url;

  try {
    const existingUrl = await Url.findOne({ originalUrl });
    if (existingUrl) {
      return res.json({
        original_url: existingUrl.originalUrl,
        short_url: existingUrl.shortUrl,
      });
    }

    const newUrl = new Url({ originalUrl: originalUrl });
    const savedUrl = await newUrl.save();

    res.json({
      original_url: savedUrl.originalUrl,
      short_url: savedUrl.shortUrl,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/shorturl/:shortUrl", (req, res) => {
  const { shortUrl } = req.params;

  Url.findOne({ shortUrl })
    .then((url) => {
      if (url) {
        res.redirect(url.originalUrl);
      } else {
        res.status(404).json({ error: "URL not found" });
      }
    })
    .catch(() => {
      res.status(500).json({ error: "Server error" });
    });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
