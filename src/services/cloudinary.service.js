import cloudinary from 'cloudinary';
import logger from '../utils/logger.js';

export const uploadToCloudinary = function(buffer, folder, options) {
  if (!options) options = {};
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    logger.info('[Cloudinary DEMO] no keys, returning placeholder');
    return Promise.resolve({
      secure_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=75',
      public_id: 'demo/' + Date.now(),
    });
  }
  cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return new Promise(function(resolve, reject) {
    var stream = cloudinary.v2.uploader.upload_stream(
      Object.assign({ folder: folder }, options),
      function(error, result) {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

export const deleteFromCloudinary = function(publicId) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return Promise.resolve();
  cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary.v2.uploader.destroy(publicId);
};

export default { uploadToCloudinary, deleteFromCloudinary };
