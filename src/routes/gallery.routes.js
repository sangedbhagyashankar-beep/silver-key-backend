import express from 'express';
const router = express.Router();

const DEMO_IMAGES = [
  { id: 1, url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', category: 'Rooms' },
  { id: 2, url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', category: 'Exterior' },
  { id: 3, url: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800', category: 'Lobby' },
  { id: 4, url: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800', category: 'Amenities' },
  { id: 5, url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800', category: 'Dining' },
  { id: 6, url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800', category: 'Rooms' },
];

router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;
    const images = category ? DEMO_IMAGES.filter(i => i.category === category) : DEMO_IMAGES;
    res.status(200).json({ success: true, images });
  } catch (error) {
    next(error);
  }
});

router.post('/upload', async (req, res, next) => {
  try {
    res.status(201).json({ success: true, message: 'Image uploaded successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
