import { Request, Response } from "express";
import { stripeInstance } from "../../utils/stripe";

const stripe = stripeInstance();

export const handleGetSubscription = async (req: Request, res: Response) => {
  try {
    const session = req.query || (req as any)?.["user"];

    if (!session) throw new Error("Forbiden");
    // Get customer by user email
    const customer = await stripe.customers.list({
      email: session.email as string,
    });
    if (customer.data.length === 0) {
      throw new Error("Subscription not found");
    }
    // Get subscription from customer

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.data[0].id,
    });

    if (subscriptions && subscriptions.data.length > 0) {
      let paymentMethod: any = null;
      const paymentMethodId: any = subscriptions.data[0].default_payment_method;
      if (paymentMethodId) {
        paymentMethod = await stripe.paymentMethods.retrieve(
          paymentMethodId.id ?? paymentMethodId
        );
      }

      res.json({ ...subscriptions.data[0], payment_method: paymentMethod });
    } else {
      throw new Error("Subscription not found");
    }
  } catch (error:any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
