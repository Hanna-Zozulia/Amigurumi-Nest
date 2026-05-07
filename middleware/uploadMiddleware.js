const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Убедимся, что директория uploads существует
const uploadDir = path.join(__dirname, '../public/img/uploads/');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Конфигурация хранилища
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
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

// Фильтр файлов - только изображения
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Допустимы только изображения (JPEG, PNG, GIF, WebP)'), false);
    }
};

// Создаем upload middleware
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB max
    }
});

// Middleware для обработки ошибок multer
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
