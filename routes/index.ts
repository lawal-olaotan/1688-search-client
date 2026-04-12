import express from 'express';
import { saveCategories } from './saveCategories';
import { perform1688ImageSearch } from '../controllers/perform1688ImageSearch';

const router = express.Router();
router.post('/save', saveCategories);
router.get('/suppliers', perform1688ImageSearch);

export default router;
