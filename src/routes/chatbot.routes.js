import express from 'express';
import { chat, recommendRooms } from '../controllers/chatbot.controller.js';

const router = express.Router();

router.post('/chat', chat);
router.post('/recommend', recommendRooms);

// Legacy endpoint (some frontends call /chatbot directly)
router.post('/', chat);

export default router;
