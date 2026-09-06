# Amigurumi Nest

A handmade toys e-commerce platform built with **Node.js + Express.js + Sequelize**, featuring authentication, shopping cart, order management, admin dashboard, product reviews, and product image uploads.

---

## Features

### Core functionality

* Product catalog with categories
* Product detail pages
* Product search
* Shopping cart (guest and authenticated users)
* Checkout system (including guest checkout)
* User registration and authentication
* Password recovery
* Review system
* Admin panel (products, orders, users, reviews)
* Product image uploads

---

## Project Architecture

```
Amigurumi-Nest/
├── app.js
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── utils/
├── views/
├── public/
└── swagger/
```

---

## Tech Stack

### Backend

* Node.js
* Express.js
* Sequelize ORM
* MySQL
* Redis (application cache)
* express-session

### Frontend

* EJS
* Bootstrap
* JavaScript

### Security

* bcryptjs
* Helmet.js
* express-rate-limit
* leo-profanity
* validator

### Tools

* Multer (file uploads)
* Nodemailer (email notifications)
* dotenv

---

## Main System Features

### Users

* Browse product catalog
* View product details
* Add products to cart
* Place orders
* Leave reviews
* Register and login
* Password recovery

### Admin

* Product management (CRUD)
* Order management
* User management
* Review moderation
* Reply to reviews

---

## Security

* Password hashing (bcrypt)
* Session-based authentication
* Protected routes and role-based access control
* Rate limiting
* Helmet and Content Security Policy (CSP) headers
* CSRF protection for state-changing requests
* Password reset tokens with expiration
* File upload validation for supported image MIME types
* Profanity filtering

---

## Shopping Cart

Two cart modes are supported:

### Guest cart

Stored in user session.

### User cart

Stored in database (Cart / CartItem).

Cart is merged after login.

---

## Orders

* Order creation
* Guest checkout support
* Order items
* Order statuses (processing, shipped, etc.)
* Email notifications

---

## Reviews

* Create and edit reviews
* Delete own reviews
* Admin moderation
* Admin replies
* Statuses: approved / hidden / blocked, with soft deletion for removed reviews

---

## Caching

Redis is used as an application cache to improve performance for:

* Products
* Product pages
* Cart data
* Reviews

User sessions are managed by `express-session` and are not stored in Redis.

---

## API & Documentation

* REST API for products, cart, and orders
* Swagger documentation:

```text
http://localhost:3000/api-docs
```

---

## Installation

```bash
git clone
cd Amigurumi-Nest
npm install
```

### .env example

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_NAME=toys

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
# Alternatively, configure REDIS_URL for a managed Redis service.

SESSION_SECRET=your_secret
SESSION_SECURE=false
APP_URL=http://localhost:3000

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_this_password
USER_EMAIL=user@example.com
USER_PASSWORD=change_this_password

MAIL_SERVICE=gmail
MAIL_HOST=
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_password
MAIL_FROM=your_email@gmail.com
ORDER_RECEIVER_EMAIL=your_email@gmail.com
```

Do not commit `.env` or real credentials to the repository. For production, configure these variables with production values, a production MySQL database, a strong `SESSION_SECRET`, and the required Redis and mail services.

---

## Running the Project

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

Production deployment requires `NODE_ENV=production`, an explicit `PORT`, production database credentials, a public `APP_URL`, a strong `SESSION_SECRET`, and any Redis or mail settings required by the enabled features.

---

## User Roles

### User

* Browse products
* Use shopping cart
* Place orders
* Leave reviews

### Admin

* Full system management
* Products, orders, users, reviews

---

## Author

Hanna Zozulia

Amigurumi Nest — educational e-commerce project built with Node.js.
