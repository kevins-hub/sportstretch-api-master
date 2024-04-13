const express = require("express");
// const stripe = require("stripe")(
//   process.env.STRIPE_SECRET
// );
const stripe = require("stripe")(process.env.STRIPE_SECRET_TEST);
const router = express.Router();

const Pool = require("pg").Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

const calculateOrderAmount = (body) => {
  const total = body.amount * 100;
  return total;
};

const getStripeAccountId = async (therapist_id) => {
  const therapist = await pool.query(
    "SELECT stripe_account_id FROM tb_therapist WHERE therapist_id = $1",
    [therapist_id]
  );
  return therapist.rows[0].stripe_account_id;
}

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
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://example.com/refresh',
      return_url: 'https://example.com/return',
      type: 'account_onboarding',
    });
    res.send({
      account: account,
      accountLink: accountLink,
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).send(`Error registering Stripe account. Error: ${err.message}`);
  }
});

router.get("/generate-stripe-login-link/:id", async (req, res) => {
  const therapist_id = parseInt(req.params.id, 10);
  const stripe_account_id = await getStripeAccountId(therapist_id);
  if (!stripe_account_id) {
    res.status(404).send("Stripe account not found for therapist.");
  }
  try {
    const loginLink = await stripe.accounts.createLoginLink(stripe_account_id);
    res.send({
      url: loginLink.url,
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).send(`Error generating login link. Error: ${err.message}`);
  }
});

router.get("/get-onboard-link/:id", async (req, res) => {
  const therapist_id = parseInt(req.params.id, 10);
  try {
    const stripe_account_id = await getStripeAccountId(therapist_id);
    if (!stripe_account_id) {
      res.status(404).send("Stripe account not found for therapist.");
    }
    const accountLink = await stripe.accountLinks.create({
      account: stripe_account_id,
      refresh_url: 'https://example.com/refresh',
      return_url: 'https://example.com/return',
      type: 'account_onboarding',
    });
    res.send({
      url: accountLink.url,
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).send(`Error generating onboarding link. Error: ${err.message}`);
  }
});

module.exports = router;
