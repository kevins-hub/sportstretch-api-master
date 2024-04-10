const express = require("express");
// const stripe = require("stripe")(
//   process.env.STRIPE_SECRET
// );
const stripe = require("stripe")(process.env.STRIPE_SECRET_TEST);
const router = express.Router();

const calculateOrderAmount = (body) => {
  const total = body.amount * 100;
  return total;
};

router.post("/create-payment-intent", async (req, res) => {
  const body = req.body;
  const totalAmount = calculateOrderAmount(body);
  const platformFee = totalAmount * 0.1;
  const stripeAccountId = body.stripeAccountId;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: "usd",
      appication_fee_amount: platformFee,
      transfer_data: {
        destination: stripeAccountId,
      }
    });
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.log(err.message);
  }
});

router.post("/register-stripe-account", async (req, res) => {
  const body = req.body;
  try {
    const account = await stripe.accounts.create({
      type: "express",
      country: 'US',
      email: body.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    }); 
    res.send({
      account: account,
    });
  } catch (err) {
    console.log(err.message);
  }
});

module.exports = router;
