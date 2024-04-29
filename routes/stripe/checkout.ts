import { Request, Response, request } from "express";
import { stripeInstance } from "../../utils/stripe";

const stripe = stripeInstance();

// Function to check if a customer exists
async function checkCustomerExists(email: string) {
  const customers = await stripe.customers.list({ email: email });
  return customers.data?.[0];
}

export async function checkoutHandler(req:Request, res: Response) {
  try {
    const { priceId,return_url,success_link, email, userId} = req.body;

    const protocol = new URL(req.headers.origin as string).protocol;// Return to the referer

    let customer = await checkCustomerExists(email);
    
    let success_url = `${protocol}//${req.headers.host}/stripe/success?session_id={CHECKOUT_SESSION_ID}&next_url=${encodeURIComponent(success_link)}`;
    let cancel_url= return_url ||
    `${protocol}//${req.headers.host
    }/stripe/cancelled?session_id={CHECKOUT_SESSION_ID}&next_url=${encodeURIComponent(
      return_url
    )}`

    // STRIPE PARAMS
    const params: any = {
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url,
      cancel_url,
      client_reference_id: userId.toString(),
      billing_address_collection: "required",
      payment_method_types: ["card"],
      metadata: {
        userId: userId,
      },
      phone_number_collection:{
        enabled:true
      },
      after_expiration:{
        recovery:{
          enabled:true,
          allow_promotion_codes:true
        }
      },
      payment_method_collection: 'always',
      expires_at: Math.floor(Date.now() / 1000) + (60*30),
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
      params.customer_email = email;
    }

    if (!checkoutSession) {
      checkoutSession = await stripe.checkout.sessions.create({
        ...params,
      });
    }

    res.status(200).json({ session: checkoutSession});


  } catch (error) {
    console.log("Error creating Checkout Session:", error);
    res.status(500).json({
      error: "Error creating checkout session",
    });
  }
}
