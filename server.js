import express from "express";
import Stripe from "stripe";
import twilio from "twilio";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const stripe = new Stripe(process.env.STRIPE_SECRET);
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

const BASE_PRICE = 40;

function getDynamicPrice(date) {
  const day = new Date(date).getDay();
  if (day === 5 || day === 6) return BASE_PRICE + 20; // weekend
  return BASE_PRICE;
}

app.post("/create-payment", async (req, res) => {
  const { date, phone } = req.body;

  const price = getDynamicPrice(date);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: price * 100,
    currency: "usd",
    automatic_payment_methods: { enabled: true }
  });

  // SMS клиенту
  await client.messages.create({
    body: `✅ Your e-bike is booked for ${date}. Price: $${price}`,
    from: process.env.TWILIO_NUMBER,
    to: phone
  });

  // SMS тебе
  await client.messages.create({
    body: `🔥 New booking: ${date}, ${phone}, $${price}`,
    from: process.env.TWILIO_NUMBER,
    to: "+17542089631"
  });

  res.send({ clientSecret: paymentIntent.client_secret, price });
});

app.listen(3000, () => console.log("Server running"));
