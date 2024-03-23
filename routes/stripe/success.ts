// import prisma from "../../../../services/prisma";
import { Request, Response } from "express";
import { stripeInstance } from "../../utils/stripe";

const stripe = stripeInstance();

/**
 *
 * @param {import('express').Request} req - Express Request object
 * @param  {import('express').Response} res - Express Response object
 */
export async function handleSuccessPayment(req: Request, res: Response) {
  try {
    // Check the agent to make sure the request is from the browser
    if (req.headers["user-agent"] && !req.headers["user-agent"].includes("Mozilla")) {
      return res.status(401).send("Forbidden request");
    }

    const { session_id, next_url } = req.query;

    // Get today's date
    const now = new Date(Date.now());

    if (!session_id) return res.status(401).send("Forbidden request");

    const session: any = await stripe.checkout.sessions.retrieve(session_id as string);

    if (!session) return res.status(401).send("Forbidden request");

    // const { userId } = session.metadata;

    // A function to upgrade user's membership
    const updateUserPlan = async (isPremium) => {
      if (typeof isPremium !== "boolean") return;
      // TODO: Update user plan

    };

    // Get expires_at
    const expires_at = new Date(session.expires_at * 1000);
    // Check if the payment is expired
    if (expires_at <= now) {
      // Update user plan
      updateUserPlan(false);

      return res.redirect(session.cancel_url ?? next_url ?? "/");
    }

    // if payment was not complete
    if (session.payment_status === "unpaid" && session.status !== "complete") {
      // Update user plan
      updateUserPlan(false);

      return res.redirect(req.headers.referer as string ?? next_url ?? "/");
    }

    if (session["payment_status"] === "paid" && session.status === "complete") {
      // Upgrade user
      updateUserPlan(true);

      // Update meta
      stripe.customers
        .update(session.customer.id ?? session.customer, {
          metadata: {
            userId: session.metadata.userId,
            plan: session?.plan?.id,
            subscription: session.subscription.id ?? session.subscription,
          },
        })
        .catch((error) => {
          console.error("Stripe Error", error);
        });
    } else {
      throw new Error("Error processing the transaction.");
    }

    if (req.signedCookies.auth_token) {
      let auth_token = JSON.parse(req.signedCookies.auth_token ?? "null");
      // auth_token.is_premium = true;
      if (auth_token && "data" in auth_token) {
        // Update user
        auth_token = {
          data: {
            ...auth_token.data,
            user: {
              ...auth_token.data.user,
              is_premium: true,
            },
          },
        };

        res.cookie("auth_token", JSON.stringify(auth_token), {
          signed: true,
          domain: auth_token?.data?.domain,
          httpOnly: process.env.NODE_ENV === "production",
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: parseInt(auth_token?.data?.expires_at),
        });
      }
    }

    res.redirect(next_url as string ?? "/");
  } catch (error) {
    console.log(error);
    // return 500
    return res
      .status(500)
      .send(
        "An internal error occured while processing your payment, please try again"
      );
  }
}
