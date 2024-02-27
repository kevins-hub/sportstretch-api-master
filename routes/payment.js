const express = require("express");
// const stripe = require("stripe")(
//   process.env.STRIPE_SECRET
// );
const stripe = require("stripe")(
  process.env.STRIPE_SECRET_TEST
);
const router = express.Router();

const calculateOrderAmount = (body) => {
    const total = body.amount * 100;
    return total;
  };

router.post("/create-payment-intent", async (req, res) => {
  const body = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: calculateOrderAmount(body),
      currency: "usd",
    });
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.log(err.message);
  }
});

module.exports = router;
