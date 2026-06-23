import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Room from '../models/Room.model.js';
import User from '../models/User.model.js';
import logger from '../utils/logger.js';

const ROOMS = [
  {
    name: 'Classic Deluxe Room',
    slug: 'classic-deluxe-room',
    type: 'deluxe',
    description: 'A beautifully appointed room featuring king-size bed, marble bathroom, flat-screen TV, and a private balcony overlooking the lush garden. Perfect for a couple or solo traveller seeking premium comfort.',
    shortDescription: 'Elegant room with king bed, garden view balcony and marble bathroom.',
    price: { base: 4500, weekend: 5500, currency: 'INR' },
    capacity: { adults: 2, children: 1 },
    size: 450,
    floor: 2,
    bedType: 'king',
    acType: 'ac',
    view: 'garden',
    isFeatured: true,
    isAvailable: true,
    amenities: [
      { name: 'Free WiFi' }, { name: 'Air Conditioning' }, { name: 'Flat Screen TV' },
      { name: 'Mini Bar' }, { name: 'Room Service' }, { name: 'Safe' },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=75', isPrimary: true, alt: 'Classic Deluxe Room' },
      { url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=75', isPrimary: false, alt: 'Bathroom' },
    ],
    ratings: { average: 4.7, count: 23 },
    policies: { checkIn: '14:00', checkOut: '12:00', smoking: false, pets: false },
  },
  {
    name: 'Premium Suite',
    slug: 'premium-suite',
    type: 'suite',
    description: 'Our signature suite offers a separate living room, a luxurious king bedroom, dual marble bathrooms with soaking tub, and sweeping pool views. Ideal for honeymoons and special occasions.',
    shortDescription: 'Spacious suite with pool view, separate living area and soaking tub.',
    price: { base: 8500, weekend: 10000, currency: 'INR' },
    capacity: { adults: 2, children: 2 },
    size: 850,
    floor: 4,
    bedType: 'king',
    acType: 'ac',
    view: 'pool',
    isFeatured: true,
    isAvailable: true,
    amenities: [
      { name: 'Free WiFi' }, { name: 'Air Conditioning' }, { name: '65" Smart TV' },
      { name: 'Soaking Tub' }, { name: 'Mini Bar' }, { name: 'Nespresso Machine' },
      { name: 'Butler Service' }, { name: 'Private Balcony' },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=75', isPrimary: true, alt: 'Premium Suite' },
      { url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=75', isPrimary: false, alt: 'Suite Bathroom' },
    ],
    ratings: { average: 4.9, count: 14 },
  },
  {
    name: 'Standard Double Room',
    slug: 'standard-double-room',
    type: 'double',
    description: 'A comfortable and well-appointed double room with a queen bed, modern bathroom, and all essential amenities. Great value for business travellers and short stays.',
    shortDescription: 'Comfortable queen bed room with modern amenities and great value.',
    price: { base: 3000, weekend: 3600, currency: 'INR' },
    capacity: { adults: 2, children: 0 },
    size: 300,
    floor: 1,
    bedType: 'queen',
    acType: 'ac',
    view: 'courtyard',
    isFeatured: false,
    isAvailable: true,
    amenities: [
      { name: 'Free WiFi' }, { name: 'Air Conditioning' }, { name: 'Flat Screen TV' }, { name: 'Work Desk' },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=75', isPrimary: true, alt: 'Standard Double Room' },
    ],
    ratings: { average: 4.3, count: 41 },
  },
  {
    name: 'Family Room',
    slug: 'family-room',
    type: 'family',
    description: 'Designed for families, this spacious room features a king bed plus two single beds, a large bathroom, and a seating area. Ideal for families with children up to 4 guests.',
    shortDescription: 'Spacious room with king + twin beds, perfect for families of 4.',
    price: { base: 5500, weekend: 6500, currency: 'INR' },
    capacity: { adults: 2, children: 2 },
    size: 600,
    floor: 2,
    bedType: 'twin',
    acType: 'ac',
    view: 'garden',
    isFeatured: true,
    isAvailable: true,
    amenities: [
      { name: 'Free WiFi' }, { name: 'Air Conditioning' }, { name: 'Flat Screen TV' },
      { name: 'Kids Amenities' }, { name: 'Room Service' },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?w=800&q=75', isPrimary: true, alt: 'Family Room' },
    ],
    ratings: { average: 4.5, count: 19 },
  },
  {
    name: 'Presidential Suite',
    slug: 'presidential-suite',
    type: 'presidential',
    description: 'The pinnacle of luxury at Silver Key Hotel. This expansive suite features a grand bedroom, private dining room, personal butler, rooftop terrace with jacuzzi, and panoramic city views.',
    shortDescription: 'Our most luxurious suite with rooftop terrace, jacuzzi and butler service.',
    price: { base: 18000, weekend: 22000, currency: 'INR' },
    capacity: { adults: 4, children: 2 },
    size: 1800,
    floor: 7,
    bedType: 'king',
    acType: 'ac',
    view: 'city',
    isFeatured: true,
    isAvailable: true,
    amenities: [
      { name: 'Free WiFi' }, { name: 'Air Conditioning' }, { name: '85" Smart TV' },
      { name: 'Jacuzzi' }, { name: 'Rooftop Terrace' }, { name: 'Personal Butler' },
      { name: 'Private Bar' }, { name: 'Dining Room' }, { name: 'Nespresso' },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=75', isPrimary: true, alt: 'Presidential Suite' },
      { url: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&q=75', isPrimary: false, alt: 'Suite View' },
    ],
    ratings: { average: 5.0, count: 6 },
  },
  {
    name: 'Cozy Single Room',
    slug: 'cozy-single-room',
    type: 'single',
    description: 'A well-designed single room with a comfortable bed, clean modern bathroom, and all key amenities. Best for solo business travellers or short stays.',
    shortDescription: 'Smart compact room for solo travellers with all essentials.',
    price: { base: 2000, weekend: 2500, currency: 'INR' },
    capacity: { adults: 1, children: 0 },
    size: 200,
    floor: 1,
    bedType: 'single',
    acType: 'ac',
    view: 'none',
    isFeatured: false,
    isAvailable: true,
    amenities: [
      { name: 'Free WiFi' }, { name: 'Air Conditioning' }, { name: 'TV' }, { name: 'Work Desk' },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=75', isPrimary: true, alt: 'Single Room' },
    ],
    ratings: { average: 4.1, count: 55 },
  },
];

export const seedDatabase = async function() {
  try {
    var roomCount = await Room.countDocuments();
    if (roomCount === 0) {
      await Room.insertMany(ROOMS);
      logger.info('Seeded ' + ROOMS.length + ' rooms');
    }

    var adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      var hash = await bcrypt.hash('Admin@1234', 12);
      await User.create({
        firstName: 'Admin',
        lastName: 'Silver Key',
        email: 'admin@silverkey.com',
        phone: '9999999999',
        password: hash,
        role: 'admin',
        isActive: true,
        isVerified: true,
      });
      logger.info('Admin user created: admin@silverkey.com / Admin@1234');
    }
  } catch (err) {
    logger.error('Seed error: ' + err.message);
  }
};
