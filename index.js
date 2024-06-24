const express = require("express");
const app = express();
const port = 4000;
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const salt = bcrypt.genSaltSync(10);
const Razorpay = require("razorpay");
const User = require("./models/user");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const jwt_secret = process.env.JWT_SECRET;
const secret = `${jwt_secret}`;
//middleware
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "your-session-secret",
    resave: false,
    saveUninitialized: true,
  })
);
// mongo connection
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
//razorpay connection
var instance = new Razorpay({
  key_id: process.env.KeyID,
  key_secret: process.env.KeySecret,
});

//signup
app.get("/auth/signup", (req, res) => {
  res.render("signup");
});

app.post("/auth/signup", async (req, res) => {
  try {
    // Create Razorpay order
    var options = {
      amount: 2000000,
      currency: "INR",
      receipt: "order_rcptid_11",
    };

    // Create order using Razorpay instance
    instance.orders.create(options, async (err, order) => {
      if (err) {
        console.error("Error creating Razorpay order:", err);
        res.status(500).send("Error creating payment order");
        return;
      }

      res.render("pay", {
        key: instance.key_id,
        order_id: options.id,
      });
    });
  } catch (err) {
    res.status(400).send("Error creating Razorpay order: " + err.message);
  }
});

//payment
app.post("/payment/success", async (req, res) => {
  const { name, username, password, email, mobile, petroleumName, location } =
    req.body;
  try {
    const user = await User.create({
      name,
      username,
      password: bcrypt.hashSync(password, salt),
      email,
      mobile,
      petroleumName,
      location,
    });
    res.redirect("/auth/login");
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Failed to register" });
  }
  res.redirect("/auth/login");
});

//login
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

//home
app.get("/auth/home", (req, res) => {
  res.render("home");
});

//logout
app.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      res.status(500).send("Error logging out");
      return;
    }
    res.redirect("/auth/login");
  });
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
