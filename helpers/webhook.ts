import emailMarketingProvider  from "../utils/mailchimp"
import { stripeInstance } from "../utils/stripe";
import {user} from '../db/queries/user'
import dotenv from "dotenv"

dotenv.config();

const stripe = stripeInstance();
const emailProvider = emailMarketingProvider();
const db = user();

export const stripeEvent = async(sig:string,payload:any)=> {

      try {
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string
        let event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
        return event
      } catch (err:any) {
        throw new Error(err.message)
      }

}

export const triggerTargetEvent = async (event:any)=> {

    const session = event.data.object;
    const type = event.type
    let eventResponse  = await triggerTarget(session,type)
    return eventResponse
}
  
export const triggerTarget = async(session:any,event:any)=>{
 

  const {customer_details,after_expiration,consent} = session
  const email_address = customer_details?.email 

    switch (event) {
      case "checkout.session.expired":
          // events triggers when user checkout session expires
        if((!customer_details?.email || !after_expiration.recovery.url) && 
          !(consent?.promotions === 'opt_in')) return false;
          const {email,name} = await db.queryUser({email:customer_details?.email})
          const listId = process.env.RECOVERY_LISTID as string
          await emailProvider.saveContact(listId,{email_address:email,name})
          return true;
        break;
      case "customer.subscription.deleted":
          // turn user object to false
          await db.findAndUpdate(email_address,{isPremium:false})
          return true 
        break;
      case "invoice.paid":
        // check for active 
        const {period_end,period_start} = session
        await db.findAndUpdate(email_address,{starts:period_start,ends:period_end,isPremium:true})
        return true 
        break
      // ... handle other event types
      case "customer.discount.created":
        // Find used coupon associate with an influencer
        // update influncers count
      break
      default:
        return false
    }

}