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


    if (!session_id) return res.status(401).send("Forbidden request");

    const session = await stripe.checkout.sessions.retrieve(session_id as string);
    let {payment_status,expires_at,customer_details,cancel_url,period_end,period_start}: any = session
    const { name,email,phone} = customer_details
    const {city,country} = customer_details.address;

    // Get expires_at
    const hasPaymentExpired = await isSessionExpired(expires_at,email)
    if(hasPaymentExpired) res.redirect(cancel_url)

      // TODO: it would be nice if code can still run
      if(!("address" in customer_details)) return null
      if (!session) return res.status(401).send("Forbidden request");
      if ( !(payment_status === "paid")) res.redirect(cancel_url)
     
      const listId = process.env.PAYINGUSERS_LISTID as string 
      await mailProvider.saveContact(listId,{name, email_address:email})
  
      // Upgrade user
      await db.findAndUpdate(email,{starts:period_start,ends:period_end,isPremium:true})
  
      res.redirect(next_url as string);

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


const isSessionExpired = async(expires_at:any,email:string)=> {

    // Get today's date
    const now = new Date(Date.now());
  // Get expires_at
  expires_at = new Date(expires_at * 1000);
   
  // Check if the payment is expired
  if (expires_at <= now) await db.updateUserPlan(email,false);
  const hasPaymentExpired = expires_at <= now ? true  : false;
  return hasPaymentExpired

}
