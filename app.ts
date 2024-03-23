



// Imports dependencies and set up http server
import express from "express";
const app = express();
import stripehandler from "./routes/stripe"


app.use(
    "/stripe", stripehandler
);

// Sets server port and logs message on success
app.listen(process.env.PORT || 1300, () =>
    console.log("Payment API is listening to:", process.env.PORT || 1300)
);
// admin->settings->api-token->custom->upload