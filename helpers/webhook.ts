import emailMarketingProvider  from "../utils/mailchimp"
import { Request, Response } from "express";
import { stripeInstance } from "../utils/stripe";
import {user} from '../db/queries/user'
import dotenv from "dotenv"

dotenv.config();

const stripe = stripeInstance();

export const stripeEvent = async(request:Request, response:Response)=> {

    const sig = request.headers["stripe-signature"] as string;
    const payload = request.body;
    let event:any
      try {
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
      } catch (err:any) {
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }
      return event
}

export const triggerTargetEvent = async (event:any)=> {

    const session = event.data.object;
    const { customer } = session

    let customers:any;

    // // Get customer information from the event object.
    if (session.customer){
        customers = await customers.retrieve(customer);
    }

    await triggerTarget(session,customer,event)

}
  
export const triggerTarget = async(customer:any,session:any,event:any)=>{

  const db = user();
  const emailProvider = emailMarketingProvider();
  const {customer_details,after_expiration,consent} = session   
  const {userId} = customer?.metadata ?? { userId: null};

    switch (event.type) {
      case "subscription_schedule.canceled":
        if (userId) await db.findAndUpdate(userId,{isPremium:false});
        break
      case "checkout.session.expired":
          // events triggers when user checkout session expires
        if((!customer_details?.email || !after_expiration.recovery.url) && 
          !(consent?.promotions === 'opt_in')) return false;
          const email_address = customer_details?.email 
          const name =  customer_details.name
          const ListId = process.env.RECOVERY_LISTID as string
          await emailProvider.saveContact(ListId,{email_address,name})
        break;
      case "customer.subscription.deleted":
          // turn user object to false
          if (userId) await db.findAndUpdate(userId,{isPremium:false})
        break;
      // ... handle other event types
      case "customer.discount.created":
        // Find used coupon associate with an influencer
        // update influncers count
      break
      default:
        return false
    }

}