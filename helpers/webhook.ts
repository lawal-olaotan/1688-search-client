import emailMarketingProvider  from "../utils/mailchimp"
import { Request, Response } from "express";
import { stripeInstance } from "../utils/stripe";
import {User} from '../db/queries/user'

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
  
  
  export const triggerTargetEvent = async (event,response:Response)=> {
    const db = new User()   
    const emailProvider = emailMarketingProvider()
    const session = event.data.object;
    console.log(event.type);

    let customer:any;


    // // Get customer information from the event object.
    if (session.customer){
        customer = await stripe.customers.retrieve(session.customer);
    }

    const { userId } = customer?.metadata ?? { userId: null };

    switch (event.type) {
      case "subscription_schedule.canceled":
        console.log(event);
        break
      case "checkout.session.expired":
          // events triggers when user checkout session expires
        if((!session.customer_details?.email 
          || !session.after_expiration.recovery.url) && 
          !(session.consent?.promotions === 'opt_in')) return response.status(200).send();
          
          const email = session.customer_details?.email 
          const recoveryUrl = session.after_expiration.recovery.url
          const listId = process.env.RECOVERY_LISTID as string

          const   {name} = await db.queryUser({email});
          await emailProvider.createContact(email,name,listId,recoveryUrl)
        break;
      case "customer.subscription.deleted":
        const cancelledSubscription = event.data.object;
        console.log(cancelledSubscription);
        // if (userId) await db.findAndUpdate(userId,'users',{isPremium:false})
        break;
      // ... handle other event types
      case "customer.discount.created":
        // Find used coupon associate with an influencer
  
      break
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }
  