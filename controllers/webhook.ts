import { Request, Response } from "express";
import { stripeEvent,triggerTargetEvent } from "../helpers/webhook";

// The library needs to be configured with your account's secret key.
// Ensure the key is kept out of any version control system you might be using
// This is your Stripe CLI webhook secret for testing your endpoint locally.


export const handlePaymentWebhook = async (request:Request, response: Response) => {
  const sig = request.headers["stripe-signature"] as string;
  const payload = request.body;
  try {
    const event = await stripeEvent(sig,payload) as any
    const isvalid = await triggerTargetEvent(event); 
    return response.status(200).json({ok:isvalid})
  } catch (error) {
    response.status(400).send(`Webhook Error: ${error.message}`);
  }
};




