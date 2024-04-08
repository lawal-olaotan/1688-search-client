// Imports dependencies and set up http server
import express, {Express} from "express";
import  bodyParser from 'body-parser';
import stripehandler from "./routes/stripe";
import webhook from "./routes/webhooks";
import cors from 'cors'
import morgan from 'morgan'
import dotenv from "dotenv"
import { dbPromise } from './db/config.ts';

dotenv.config(); 


const app:Express = express();


app.use(cors());
app.use(morgan('dev'));
app.use("/webhook", webhook);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({limit:'200mb', extended:false}));


app.use("/stripe", stripehandler);

// Sets server port and logs message on success
app.listen(process.env.PORT || 3001, async() =>{
    await dbPromise
    console.log("Payment API is listening to:", process.env.PORT || 3001)
}
    
);

