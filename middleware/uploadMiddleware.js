const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure the uploads directory exists before any file handling starts.
const uploadDir = path.join(__dirname, '../public/img/uploads/');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure disk storage for uploaded files.
const storage = multer.diskStorage({
    /**
     * Sends uploaded files to the shared uploads directory.
     */
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    /**
     * Generates a short, normalized filename for each upload.
     */
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);

        const name = path.basename(file.originalname, ext)
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .slice(0, 6);

        const shortId = crypto.randomBytes(2).toString('hex');

        cb(null, `${name}-${shortId}${ext}`);
    }
});

// Accept images only.
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Допустимы только изображения (JPEG, PNG, GIF, WebP)'), false);
    }
};

// Create the reusable Multer upload middleware.
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB max
    }
});

/**
 * Converts Multer errors into consistent HTTP responses.
 */
function handleUploadError(err, req, res, next) {

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Файл слишком большой (макс 20MB)' });
        }
        return res.status(400).json({ error: 'Ошибка загрузки файла' });
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
}

module.exports = {
    upload,
    uploadSingle: upload.single('image'),
    uploadImageAndImage2: upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'image2', maxCount: 1 }
    ]),
    handleUploadError
};
