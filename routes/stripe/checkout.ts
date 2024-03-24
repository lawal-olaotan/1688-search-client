import Stripe from "stripe";
import { Request, Response, request } from "express";
import { stripeInstance } from "../../utils/stripe";

const stripe = stripeInstance();

// Function to check if a customer exists
async function checkCustomerExists(email: string) {
  const customers = await stripe.customers.list({ email: email });
  return customers.data?.[0];
}

export async function checkoutHandler(req: Request, res: Response) {
  try {
    const { package: packageId, mode, referer } = req.body;
    const session: any = req.query || (req as any).user;

    const protocol = new URL(req.headers.origin as string).protocol;
    // Return to the referer
    const returnTo = referer || req.headers.referer || "/";

    const pricingPackage = await stripe.products
      .search({
        query: `name:"${packageId ?? "premium"}"`,
      })
      .then((res) => res.data?.[0])
      .catch((err) => {
        console.error(err);
        return null;
      });

    let customer = await checkCustomerExists(session.email);

    // STRIPE PARAMS
    const params: any = {
      mode: mode || "subscription",
      line_items: [
        {
          price: pricingPackage?.default_price || process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${protocol}//${req.headers.host
        }/stripe/success?session_id={CHECKOUT_SESSION_ID}&next_url=${encodeURIComponent(
          returnTo
        )}`,
      cancel_url:
        returnTo ||
        `${protocol}//${req.headers.host
        }/stripe/cancelled?session_id={CHECKOUT_SESSION_ID}&next_url=${encodeURIComponent(
          returnTo
        )}`,
      client_reference_id: session.userId.toString(),
      billing_address_collection: "required",
      currency: "USD",
      payment_method_types: ["card"],
      metadata: {
        userId: session.userId,
      },
      // customer_creation: "if_required",
      // automatic_tax: {
      //   enabled: true,
      // },
    };

    let checkoutSession: any;

    if (customer) {
      if ("subscription" in customer.metadata) {
        if (typeof customer.metadata["subscription"] === "string") {
          checkoutSession = await stripe.subscriptions.retrieve(
            customer.metadata["subscription"]
          );
        }
      } else {
        checkoutSession = await stripe.subscriptions.list({
          customer: customer.id,
        });
      }

      if ('ended_at' in checkoutSession || 'current_period_end' in checkoutSession) {
        const now = Date.now();
        const ends =
          checkoutSession.ended_at || checkoutSession?.current_period_end;

        // check if subscription has expired
        if (now / 1000 >= ends) {
          checkoutSession = null;
          params.customer = customer.id;
        }
      }
      // Update the param
      if (!checkoutSession) {
        params.customer = customer.id;
      }
    } else {
      // Create new customer
      params.customer_email = session.email;
    }

    if (!checkoutSession) {
      checkoutSession = await stripe.checkout.sessions.create({
        ...params,
      });
    }
    res.status(200).json({ session: checkoutSession });
  } catch (error) {
    console.log("Error creating Checkout Session:", error);
    res.status(500).json({
      error: "Error creating checkout session",
    });
  }
}
