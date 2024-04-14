// import prisma from "../../../../services/prisma";
import { Request, Response } from "express";
import { stripeInstance } from "../../utils/stripe";
import { user } from "../../db/queries/user";
import emailMarketingProvider  from "../../utils/mailchimp";
import dotenv from "dotenv"

dotenv.config();

const stripe = stripeInstance();
const db = user()
const mailProvider = emailMarketingProvider()



 // A function to upgrade user's membership
/**
 *
 * @param {import('express').Request} req - Express Request object
 * @param  {import('express').Response} res - Express Response object
 */
export async function handleSuccessPayment(req: Request, res: Response) {
  try {

    if (req.headers["user-agent"] && !req.headers["user-agent"].includes("Mozilla")) {
      return res.status(401).send("Forbidden request");
    }

    const { session_id, next_url } = req.query;

    // Get today's date
    const now = new Date(Date.now());
    if (!session_id) return res.status(401).send("Forbidden request");

    const session = await stripe.checkout.sessions.retrieve(session_id as string);
    let {payment_status,expires_at,customer_details,metadata,cancel_url}: any = session

      // TODO: it would be nice if code can still run
      if(!("address" in customer_details)) return null
      if (!session) return res.status(401).send("Forbidden request");
     
      if ( !(payment_status === "paid")) throw new Error("Error processing the transaction.");

    const {userId} = metadata

    // Get expires_at
     expires_at = new Date(expires_at * 1000);
    // Check if the payment is expired
    if (expires_at <= now) {
      // Update user plan
      await db.updateUserPlan(userId,false);
      return res.redirect(cancel_url ?? next_url ?? "/");
    }

      const listId = process.env.PAYINGUSERS_LISTID as string 
      const { name,email,phone} = customer_details
      const {city,country} = customer_details.address;
      await mailProvider.saveContact(listId,{name, email_address:email, city, country, phone})
      
      // Upgrade user
      await db.updateUserPlan(userId,true)
      
    res.redirect(next_url as string ?? "/Dashboard/premium");

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
