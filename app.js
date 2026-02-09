const express = require('express');
const path = require('path');
const webRoutes = require('./routes/web');

const app = express();
const PORT = process.env.PORT || 3000;

// Если используешь шаблоны EJS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Роуты
app.use('/', webRoutes);

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`);
});