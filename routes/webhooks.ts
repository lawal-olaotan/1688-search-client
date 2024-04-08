import express from "express";
import bodyParser from "body-parser";
import { handlePaymentWebhook } from "../controllers/webhook";


const router = express.Router();
router.post('/', express.raw({type:'application/json'}),handlePaymentWebhook)

export default router