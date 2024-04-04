// Imports dependencies and set up http server
import express, {Express} from "express";
import  bodyParser from 'body-parser';
import stripehandler from "./routes/stripe";
import cors from 'cors'
import morgan from 'morgan'


const app:Express = express();

app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({limit:'200mb', extended:false}));

app.use("/stripe", stripehandler);

// Sets server port and logs message on success
app.listen(process.env.PORT || 3001, () =>
    console.log("Payment API is listening to:", process.env.PORT || 3001)
);