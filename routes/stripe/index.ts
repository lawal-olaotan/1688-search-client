import express from "express";

// import { verifyToken } from "../../utils/jwt";
import { handleCanceledPayment } from "./cancelled";
import { checkoutHandler } from "./checkout";
import { handleGetSubscription } from "./getSubscription";
import { handleSuccessPayment } from "./success";

const router = express.Router();
router.post("/checkout",checkoutHandler);
router.get("/success", handleSuccessPayment);
router.get("/cancelled", handleCanceledPayment);
router.post("/get-subscription",/*  verifyToken, */ handleGetSubscription);

export default router;
