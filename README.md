# Amigurumi Nest

A full-featured handmade toys e-commerce platform built with **Node.js + Express.js + Sequelize**, featuring authentication, shopping cart, order management, admin dashboard, and product reviews.

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
* Redis
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
* Protected routes middleware
* Rate limiting
* Helmet & CSP headers
* File upload validation (MIME types)
* Profanity filtering
* Secure password reset tokens

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
* Statuses: pending / approved / blocked

---

## Caching

Redis is used to improve performance:

* Products
* Product pages
* Cart data
* Reviews

---

## API & Documentation

* REST API for products, cart, and orders
* Swagger documentation:

```
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
DB_USER=root
DB_PASS=your_password
DB_NAME=toys

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

SESSION_SECRET=your_secret
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_password
```

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

Amigurumi Nest — educational e-commerce project built with Node.js.
