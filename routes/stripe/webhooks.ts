import prisma from "../../../../services/prisma";
import { stripeInstance } from "../../../../utils/stripe";

// The library needs to be configured with your account's secret key.
// Ensure the key is kept out of any version control system you might be using.
const stripe = stripeInstance();

// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret =
  process.env.STRIPE_WEBHOOK_SECRET ||
  "whsec_455d12cf897434b84e88dd22dd6d25bdd46c2352635cd92293139cf51303e044";

export const handlePaymentWebhook = async (request, response) => {
  try {
    const sig = request.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
      console.error(err);
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    let eventData = event.data.object;
    let customer;
    // Get customer information from the event object.
    if (eventData.customer)
      customer = await stripe.customers.retrieve(eventData.customer);

    const { userId } = customer?.metadata ?? { userId: null };
    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntentSucceeded = event.data.object;
        // Then define and call a function to handle the event payment_intent.succeeded
        console.log(paymentIntentSucceeded);
        break;
      case "payment_intent.created":
        const paymentIntentCreated = event.data.object;
        // Then define and call a function to handle the event payment_intent.created
        console.log(paymentIntentCreated);
        break;
      case "customer.subscription.updated":
        const subscriptionUpdate = event.data.object;
        // Get customer

        // Check if the subscription is paused
        if (subscriptionUpdate.pause_collection) {
          // Update user plan
          await prisma.users.update({
            where: { ID: +userId },
            data: {
              is_premium: false,
            },
          });
          console.log("Subscription is paused");
        } else {
          if (userId)
            // Update user plan
            await prisma.users.update({
              where: { ID: +userId },
              data: {
                is_premium: true,
              },
            });
          console.log("Subscription is resumed");
        }
        break;
      case "subscription_schedule.cancelled":
      case "customer.subscription.deleted":
        const cancelledSubscription = event.data.object;
        if (userId)
          // Update user plan
          await prisma.users.update({
            where: { ID: +userId },
            data: {
              is_premium: false,
            },
          });
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    response.send();
  } catch (error) {
    console.error(error);
    response.send();
  }
};
