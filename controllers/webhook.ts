import { Request, Response } from "express";
import { stripeEvent,triggerTargetEvent } from "../helpers/webhook";

// The library needs to be configured with your account's secret key.
// Ensure the key is kept out of any version control system you might be using.


// This is your Stripe CLI webhook secret for testing your endpoint locally.


export const handlePaymentWebhook = async (request:Request, response: Response) => {
  try {
    const event = await stripeEvent(request,response) as any
    await triggerTargetEvent(event); 
    // Return a 200 response to acknowledge receipt of the event
    response.status(200).send();
  } catch (error) {
    console.error(error);
    response.send();
  }
};




