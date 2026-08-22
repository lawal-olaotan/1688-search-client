import express from 'express';
import { supplierController } from '../controllers/supplierController';

const router = express.Router();
router.post('/suppliers', supplierController);

export default router;
