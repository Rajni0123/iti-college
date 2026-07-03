const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF and image files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB (increased for PDF files)
    files: 5, // admission form uploads up to 4 files (photo, aadhaar, marksheet, credit card doc)
  },
  fileFilter: fileFilter,
});

// Error handling middleware for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum file size is 50MB. Please compress your file or choose a smaller file.`,
          error: err.message,
          code: err.code
        });
      }
      return res.status(400).json({
        success: false,
        message: `File upload error: ${err.message}`,
        error: err.message,
        code: err.code
      });
    }
    // Handle other multer/file errors
    if (err.message && err.message.includes('Only PDF')) {
      return res.status(400).json({
        success: false,
        message: err.message,
        error: err.message
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error',
      error: err.message
    });
  }
  next();
};

module.exports = upload;
module.exports.handleMulterError = handleMulterError;