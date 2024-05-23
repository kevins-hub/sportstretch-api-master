const express = require("express");
const app = express();
const config = require("config");
const therapists = require("./routes/therapists");
const bookings = require("./routes/bookings");
const ratings = require("./routes/ratings");
const register = require("./routes/register");
const auth = require("./routes/auth");
const password = require("./routes/password");
const expoPushTokens = require("./routes/expoPushTokens");
const notifications = require("./routes/notifications");
const contact = require("./routes/contact");
const payment = require("./routes/payment");
const report = require("./routes/report");

app.use(express.json());
app.use("/therapists", therapists);
app.use("/bookings", bookings);
app.use("/ratings", ratings);
app.use("/register", register);
app.use("/auth", auth);
app.use("/password", password);
app.use("/expoPushTokens", expoPushTokens);
app.use("/notifications", notifications);
app.use("/contact", contact);
app.use("/payment", payment);
app.use("/report", report);

app.get("/", (req, res) => {
  res.send("Sportstretch server is running!");
});

const port = process.env.PORT || config.get("port");

app.listen(port, () => {
  console.log("Server running on port " + port);
});
