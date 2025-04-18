const express = require("express");
// const stripe = require("stripe")(
//   process.env.STRIPE_SECRET
// );
const stripe = require("stripe")(process.env.ENVIRONMENT === 'qa' ? process.env.STRIPE_SECRET_TEST : process.env.STRIPE_SECRET);
const router = express.Router();

const Pool = require("pg").Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

const stripeProcessingFeePercentage = 0.03; // 3%
const feePercentage = 0.15; // 15%

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
};

router.post("/create-payment-intent", async (req, res) => {
  const body = req.body;
  const totalAmount = calculateOrderAmount(body);
  const platformFee = (totalAmount * (feePercentage - stripeProcessingFeePercentage)).toString();
  const stripeAccountId = body.stripeAccountId;
  console.warn("platformFee = ", platformFee);
  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: totalAmount,
        currency: "usd",
        payment_method_types: ['card'],
        // application_fee_amount: platformFee,
        application_fee_amount: "0",
        capture_method: "manual",
      },
      {
        stripeAccount: stripeAccountId,
      }
    );
    console.warn("payment intent = ", paymentIntent);
    res.send({
      paymentIntent: paymentIntent,
    });
  } catch (err) {
    res
      .status(500)
      .send(`Error creating payment intent. Error: ${err.message}`);
  }
});

router.post("/register-stripe-account", async (req, res) => {
  const body = req.body;
  try {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: body.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: "https://example.com/refresh",
      return_url: "https://example.com/return",
      type: "account_onboarding",
    });
    res.send({
      account: account,
      accountLink: accountLink,
    });
  } catch (err) {
    res
      .status(500)
      .send(`Error registering Stripe account. Error: ${err.message}`);
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
    res.status(500).send(`Error generating login link. Error: ${err.message}`);
  }
});

router.get("/get-onboard-link/:id", async (req, res) => {
  const therapist_id = parseInt(req.params.id, 10);
  if (!therapist_id) {
    res.status(400).send("Invalid therapist ID.");
  }
  try {
    const stripe_account_id = await getStripeAccountId(therapist_id);
    if (!stripe_account_id) {
      res.status(404).send("Stripe account not found for therapist.");
    }
    const accountLink = await stripe.accountLinks.create({
      account: stripe_account_id,
      refresh_url: "https://kevins-hub.github.io/stripe-redirects/onboarding-refresh.html",
      return_url: "https://kevins-hub.github.io/stripe-redirects/onboarding-complete.html",
      type: "account_onboarding",
    });
    res.send({
      url: accountLink.url,
    });
  } catch (err) {
    res
      .status(500)
      .send(`Error generating onboarding link. Error: ${err.message}`);
  }
});

router.get("/retrieve-stripe-account/:id", async (req, res) => {
  const therapist_id = parseInt(req.params.id, 10);
  if (!therapist_id) {
    res.status(400).send("Invalid therapist ID.");
  }
  try {
    const stripe_account_id = await getStripeAccountId(therapist_id);
    if (!stripe_account_id) {
      res.status(404).send("Stripe account not found for therapist.");
    }
    const account = await stripe.accounts.retrieve(stripe_account_id);
    if (!account) {
      res.status(404).send("Stripe account not found.");
    }
    await pool.query(
      "UPDATE tb_therapist SET accepts_payments = $1 WHERE therapist_id = $2",
      [account.payouts_enabled ? true : false, therapist_id]
    );
    res.send(account);
  } catch (err) {
    res
      .status(500)
      .send(`Error retrieving Stripe account. Error: ${err.message}`);
  }
});

module.exports = router;
