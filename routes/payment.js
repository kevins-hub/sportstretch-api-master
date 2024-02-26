const express = require("express");
// const stripe = require("stripe")(
//   process.env.STRIPE_SECRET
// );
const stripe = require("stripe")(
  process.env.STRIPE_SECRET_TEST
);
const router = express.Router();

const calculateOrderAmount = (items) => {
    // Replace this constant with a calculation of the order's amount
    // Calculate the order total on the server to prevent
    // people from directly manipulating the amount on the client
    const total = items.amount * 100;
    return total;
  };

router.post("/create-payment-intent", async (req, res) => {
  const { items } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: calculateOrderAmount(items),
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
