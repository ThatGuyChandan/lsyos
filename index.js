const express = require("express");
const app = express();
const port = 4000 || process.env.PORT;
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const salt = bcrypt.genSaltSync(10);
const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("./models/user");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const jwt_secret = process.env.JWT_SECRET;
const secret = `${jwt_secret}`;

// Middleware
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.sessionSecret,
    resave: false,
    saveUninitialized: true,
  })
);

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

// Razorpay connection
var instance = new Razorpay({
  key_id: process.env.KeyID,
  key_secret: process.env.KeySecret,
});

// Signup
app.get("/auth/signup", (req, res) => {
  res.render("signup");
});

app.post("/auth/signup", async (req, res) => {
  const { username, email } = req.body;

  // Check if the user already exists
  const existingUser = await User.findOne({ $or: [{ username }, { email }] });

  if (existingUser) {
    res.redirect("/auth/login");
    return;
  }
  try {
    // Create Razorpay order
    var options = {
      amount: 2000000,
      currency: "INR",
      receipt: "order_rcptid_11",
    };

    instance.orders.create(options, (err, order) => {
      if (err) {
        console.error("Error creating Razorpay order:", err);
        res.status(500).send("Error creating payment order");
        return;
      }
      req.session.order_id = order.id;
      req.session.userDetails = req.body;

      res.render("pay", {
        key: instance.key_id,
        order_id: order.id,
      });
    });
  } catch (err) {
    res.status(400).send("Error creating Razorpay order: " + err.message);
  }
});

// Payment success
app.post("/auth/payment/success", async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
    req.body;

  // Verify payment signature to ensure payment is successful
  const generated_signature = crypto
    .createHmac("sha256", process.env.KeySecret)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generated_signature !== razorpay_signature) {
    return res.status(400).send("Payment verification failed");
  }

  const userDetails = req.session.userDetails;

  try {
    const { name, username, password, email, mobile, petroleumName, location } =
      userDetails;

    const user = await User.create({
      name,
      username,
      password: bcrypt.hashSync(password, salt),
      email,
      mobile,
      petroleumName,
      location,
    });
    req.session.userDetails = null; // Clear user details from session
    res.redirect("/auth/login");
  } catch (error) {
    console.error(error);
    res.status(400).send("Failed to register user");
  }
});

// Login
app.get("/auth/login", (req, res) => {
  res.render("login");
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });

  if (!user) {
    res.status(400).send("User not found");
    return;
  }

  const passOk = bcrypt.compareSync(password, user.password);
  if (passOk) {
    jwt.sign({ username, id: user._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie("token", token).redirect("/auth/home");
    });
  } else {
    res.status(400).send("Password or username is wrong");
  }
});

// Home
app.get("/auth/home", (req, res) => {
  const { name } = req.body;
  res.render("home", {
    name: name,
  });
});

// Logout
app.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      res.status(500).send("Error logging out");
      return;
    }
    res.clearCookie("token");
    res.redirect("/auth/login");
  });
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
