import express from 'express';
import { saveCategories } from './saveCategories';
import { supplierController } from '../controllers/supplierController';

const router = express.Router();
router.post('/save', saveCategories);
router.get('/suppliers', supplierController);

export default router;
