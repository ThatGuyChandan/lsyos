const express = require("express");
const app = express();
const port = 4000;
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const salt = bcrypt.genSaltSync(10);
const Razorpay = require("razorpay");
const User = require("./models/user");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const jwt_secret = process.env.JWT_SECRET;
const secret = `${jwt_secret}`;
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

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
var instance = new Razorpay({
  key_id: process.env.KeyID,
  key_secret: process.env.KeySecret,
});

//signup
app.get("/auth/signup", (req, res) => {
  res.render("signup");
});

app.post("/auth/signup", async (req, res) => {
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
    res.render("login");
  } catch (err) {
    res.status(400).send("Error registering user: " + err.message);
  }
});
//payment
app.get("/payment", (req, res) => {
  var options = {
    amount: 2000000,
    currency: "INR",
    receipt: "order_rcptid_11",
  };
  const order = instance.orders.create(options);
  res.render("pay", {
    key: instance.key_id,
    order_id: order.id,
  });
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
      res.cookie("token", token).render("home");
    });
  } else {
    res.status(400).send("Password or username is wrong");
  }
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
