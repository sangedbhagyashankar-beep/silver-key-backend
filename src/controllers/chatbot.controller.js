import Room from '../models/Room.model.js';
import { AppError } from '../utils/AppError.js';

// ─── Fallback keyword replies (used when no AI key is configured) ─
const KEYWORD_RULES = [
  { keywords: ['book', 'reserv', 'room'], reply: 'To book a room, visit our Rooms page, pick your preferred room and dates, then follow the booking wizard. Need help choosing? Tell me your budget and number of guests!' },
  { keywords: ['price', 'cost', 'rate', 'charge', 'fee'], reply: 'Our rooms start from ₹3,000/night (Deluxe), ₹5,000/night (Suite), and ₹12,000/night (Presidential Suite). All rates include complimentary breakfast and WiFi.' },
  { keywords: ['check-in', 'checkin', 'check in', 'arrive', 'arrival'], reply: 'Check-in time is 2:00 PM. Early check-in is available on request subject to availability. Please carry a valid ID proof.' },
  { keywords: ['check-out', 'checkout', 'check out', 'depart', 'leave'], reply: 'Check-out time is 12:00 PM. Late check-out can be arranged on request. Additional charges may apply after 3:00 PM.' },
  { keywords: ['cancel', 'refund'], reply: 'Free cancellation is available up to 24 hours before check-in. Cancellations within 24 hours are non-refundable. Contact us at +91 93228 00100 for assistance.' },
  { keywords: ['wifi', 'internet'], reply: 'Complimentary high-speed WiFi is available throughout the hotel — in all rooms, lobby, restaurant, and pool area.' },
  { keywords: ['pool', 'swim', 'spa', 'gym', 'fitness'], reply: 'We have a rooftop swimming pool (7 AM–10 PM), a full spa, and a well-equipped fitness center — all complimentary for guests.' },
  { keywords: ['food', 'restaurant', 'dining', 'breakfast', 'lunch', 'dinner'], reply: 'Our on-site restaurant serves Indian and Continental cuisine. Breakfast is included with most room plans. Room service is available 24/7.' },
  { keywords: ['park', 'parking', 'car'], reply: 'Free covered parking is available for all guests. Valet service is also available upon request.' },
  { keywords: ['airport', 'transfer', 'pickup'], reply: 'We offer airport transfer services to/from Kempegowda International Airport. Please book in advance by calling +91 93228 00100.' },
  { keywords: ['location', 'address', 'where', 'direction'], reply: 'We are at: Electronic City Post, Hebbagodi, Bengaluru — 560135. Just 5 minutes from Infosys and Wipro campuses. Call +91 93228 00100 for directions.' },
  { keywords: ['pet', 'dog', 'cat'], reply: 'We are pet-friendly! Small pets (under 10 kg) are welcome. Please inform us in advance — a small additional charge applies.' },
  { keywords: ['ameniti', 'facilit', 'offer'], reply: 'Silver Key Hotel offers: Free WiFi, Swimming Pool, Spa, Restaurant, 24/7 Room Service, Airport Transfer, Fitness Center, Free Parking, and Conference Rooms.' },
  { keywords: ['contact', 'phone', 'call', 'email', 'reach'], reply: 'Reach us at: 📞 +91 93228 00100 | 📧 reservations@silverkey.com | We are available 24/7.' },
  { keywords: ['hello', 'hi', 'hey', 'good morning', 'namaste'], reply: "Welcome to Silver Key Hotel! 🏨 I'm your AI concierge. How can I assist you today?" },
];

const DEFAULT_REPLY = 'Thank you for reaching out to Silver Key Hotel! For personalized assistance, please call our front desk at +91 93228 00100 or email reservations@silverkey.com. We\'re available 24/7!';

const getKeywordReply = (message) => {
  const lower = message.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) return rule.reply;
  }
  return null;
};

// ─── Claude AI chat (if ANTHROPIC_API_KEY is set) ─────────────────
const HOTEL_SYSTEM_PROMPT = `You are the AI concierge for Silver Key Hotel, a premium luxury hotel in Electronic City, Bengaluru, Karnataka, India.

HOTEL DETAILS:
- Name: Silver Key Hotel
- Address: Electronic City Post, Hebbagodi, Bengaluru - 560135
- Phone: +91 93228 00100
- Email: reservations@silverkey.com
- Check-in: 2:00 PM | Check-out: 12:00 PM

ROOM TYPES & PRICES (base per night):
- Standard Single: ₹3,000
- Standard Double: ₹3,500
- Deluxe Room: ₹4,500
- Premium Suite: ₹7,000
- Family Room: ₹5,500
- Presidential Suite: ₹12,000

AMENITIES: Free WiFi, Rooftop Pool (7AM-10PM), Spa, Fitness Center, Restaurant (Indian & Continental), 24/7 Room Service, Free Parking, Valet, Airport Transfer, Conference Rooms

POLICIES:
- Free cancellation up to 24 hours before check-in
- Breakfast included with most plans
- Pets allowed (under 10kg, advance notice required, small charge)
- Early check-in / late check-out on request

INSTRUCTIONS:
- Be warm, professional, and helpful
- Keep replies concise (2-4 sentences max)
- For bookings, direct users to the website's Rooms page
- For urgent needs, provide the phone number
- Respond in the same language as the user
- Don't make up information not in this prompt`;

const callClaudeAPI = async (messages) => {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: HOTEL_SYSTEM_PROMPT,
        messages: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.content?.[0]?.text || null;
  } catch (err) {
    return null;
  }
};

export const chat = async (req, res, next) => {
  try {
    const { messages = [], sessionId } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return next(new AppError('Messages array required', 400));
    }

    const lastMsg = messages[messages.length - 1]?.content || '';
    let reply = null;

    // Try Claude AI first
    if (process.env.ANTHROPIC_API_KEY) {
      reply = await callClaudeAPI(messages);
    }

    // Fallback to keyword matching
    if (!reply) {
      reply = getKeywordReply(lastMsg) || DEFAULT_REPLY;
    }

    res.json({
      success: true,
      message: reply,
      sessionId,
      aiPowered: !!process.env.ANTHROPIC_API_KEY,
      suggestions: ['Room prices', 'Check-in time', 'Amenities', 'Contact us'],
    });
  } catch (err) {
    next(err);
  }
};

export const recommendRooms = async (req, res, next) => {
  try {
    const { budget, guests, checkIn, checkOut } = req.body;

    const filter = { isAvailable: true };
    if (guests) filter['capacity.adults'] = { $gte: Number(guests) };

    if (budget && checkIn && checkOut) {
      const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
      const perNight = budget / nights;
      filter['price.base'] = { $lte: perNight * 1.2 };
    } else if (budget) {
      filter['price.base'] = { $lte: Number(budget) * 1.2 };
    }

    const rooms = await Room.find(filter)
      .select('name type price capacity images ratings acType description shortDescription')
      .sort('-ratings.average')
      .limit(3);

    res.json({ success: true, recommendations: rooms });
  } catch (err) {
    next(err);
  }
};
