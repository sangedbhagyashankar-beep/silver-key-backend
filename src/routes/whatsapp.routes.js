import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ success: false, message: 'Verification failed' });
  }
});

router.post('/', (req, res) => {
  console.log('Incoming WhatsApp webhook:', JSON.stringify(req.body, null, 2));
  res.status(200).json({ success: true });
});

export default router;
