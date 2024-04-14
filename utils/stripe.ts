
import Stripe from 'stripe';
import dotenv from "dotenv"

dotenv.config();

export const stripeInstance = () => {
    return new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2023-10-16' });
};

// export const update = (customer,plan,subscription,userId)=> {
//     const stripe = stripeInstance()

//     return stripe.customers
//         .update(customer.id ?? customer, {
//           metadata: {
//             userId: userId,
//             plan: plan?.id,
//             subscription: subscription.id ?? subscription,
//           },
//         })
//         .catch((error) => {
//           console.error("Stripe Error", error);
//         });
// }




// if (req.signedCookies.auth_token) {
    //   let auth_token = JSON.parse(req.signedCookies.auth_token ?? "null");
    //   // auth_token.is_premium = true;
    //   if (auth_token && "data" in auth_token) {
    //     // Update user
    //     auth_token = {
    //       data: {
    //         ...auth_token.data,
    //         user: {
    //           ...auth_token.data.user,
    //           is_premium: true,
    //         },
    //       },
    //     };

    //     res.cookie("auth_token", JSON.stringify(auth_token), {
    //       signed: true,
    //       domain: auth_token?.data?.domain,
    //       httpOnly: process.env.NODE_ENV === "production",
    //       secure: process.env.NODE_ENV === "production",
    //       sameSite: "lax",
    //       path: "/",
    //       maxAge: parseInt(auth_token?.data?.expires_at),
    //     });
    //   }
    // }