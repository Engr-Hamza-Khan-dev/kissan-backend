# Khaity Backend

Express.js + MongoDB REST API for Khaity Livestock Marketplace Admin Dashboard

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start MongoDB
mongod

# 3. Seed database with demo data
npm run seed

# 4. Start server
npm run dev
```

Server runs on: `http://localhost:5000/api`

## 🔑 Demo Login

```
Email: admin@khaity.com
Password: admin123
```

## 📦 Features

- ✅ JWT Authentication & Authorization
- ✅ Admin Dashboard with Statistics
- ✅ Product Management (CRUD)
- ✅ Category Management
- ✅ Order Management with Status Tracking
- ✅ Customer Profiles & History
- ✅ Notification System
- ✅ Input Validation (Zod)
- ✅ Role-Based Access Control
- ✅ Password Hashing (bcryptjs)

## 📋 API Endpoints (30 Total)

### Authentication
- `POST /auth/login` - Admin login
- `POST /auth/register` - Create admin
- `GET /auth/profile` - Get profile (Protected)

### Dashboard
- `GET /admin/dashboard` - Statistics (Protected)

### Orders (5 endpoints)
- `GET /orders` - List orders (Protected)
- `POST /orders` - Create order (Protected)
- `GET /orders/:id` - Get order (Protected)
- `PUT /orders/:id` - Update order (Protected)
- `DELETE /orders/:id` - Delete order (Protected)

### Products (5 endpoints)
- `GET /products` - List products
- `POST /products` - Create product (Protected)
- `GET /products/:id` - Get product
- `PUT /products/:id` - Update product (Protected)
- `DELETE /products/:id` - Delete product (Protected)

### Categories (5 endpoints)
- `GET /categories` - List categories
- `POST /categories` - Create category (Protected)
- `GET /categories/:id` - Get category
- `PUT /categories/:id` - Update category (Protected)
- `DELETE /categories/:id` - Delete category (Protected)

### Customers (5 endpoints)
- `GET /customers` - List customers (Protected)
- `POST /customers` - Create customer (Protected)
- `GET /customers/:id` - Get customer (Protected)
- `PUT /customers/:id` - Update customer (Protected)
- `DELETE /customers/:id` - Delete customer (Protected)

### Notifications (6 endpoints)
- `GET /notifications` - List notifications (Protected)
- `POST /notifications` - Create notification (Protected)
- `GET /notifications/:id` - Get notification (Protected)
- `PUT /notifications/:id/read` - Mark as read (Protected)
- `PUT /notifications/mark-all/read` - Mark all as read (Protected)
- `DELETE /notifications/:id` - Delete notification (Protected)

## 🔐 Authentication

Include token in Authorization header:

```
Authorization: Bearer <token>
```

## 📦 Database Models

- **Admin** - User accounts with roles
- **Product** - Livestock & supplies
- **Order** - Customer orders with items
- **Category** - Product categories
- **Customer** - Customer profiles & stats
- **Notification** - System notifications

## 🛠️ NPM Scripts

```bash
npm start          # Production server
npm run dev        # Development server (hot reload)
npm run seed       # Seed database with demo data
npm test           # Run tests
```

## ⚙️ Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/khaity
JWT_SECRET=khaity-secret-key-2024
NODE_ENV=development
```

## 📁 Project Structure

```
src/
├── app.js                # Express setup
├── index.js              # Server entry
├── config/database.js    # MongoDB connection
├── controllers/          # 7 request handlers
├── models/               # 6 Mongoose schemas
├── routes/               # 7 API modules
├── middleware/           # Auth & error handling
├── utils/                # Validators & helpers
└── services/seed.js      # Database seeding
```

## 🧪 Test API

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@khaity.com","password":"admin123"}'
```

### Get Dashboard (with token)
```bash
curl -X GET http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔧 Setup MongoDB

### Local MongoDB
```bash
# Windows/Mac: Download and install from mongodb.com
# Or use Homebrew (Mac): brew install mongodb-community
# Start: mongod
```

### MongoDB Atlas (Cloud)
Replace `MONGODB_URI` in `.env` with your Atlas connection string:
```
mongodb+srv://username:password@cluster.mongodb.net/khaity
```

## 📚 Database Seeding

```bash
npm run seed
```

Creates:
- Admin account (admin@khaity.com / admin123)
- 4 Categories
- 5 Products
- 4 Customers
- 4 Sample Orders

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection error | Ensure MongoDB is running with `mongod` |
| Port 5000 already in use | Change PORT in `.env` or kill process on port 5000 |
| 401 Unauthorized | Include Authorization header with token |
| Validation error | Check request body matches schema |

## 💾 Tech Stack

- **Runtime**: Node.js 14+
- **Framework**: Express.js 5.3.0
- **Database**: MongoDB 4.0+
- **ODM**: Mongoose 9.12.1
- **Authentication**: JWT + bcryptjs
- **Validation**: Zod
- **Utilities**: CORS, dotenv

## 📖 API Response Format

Success:
```json
{
  "success": true,
  "data": {},
  "pagination": { "total": 10, "page": 1, "pages": 1 }
}
```

Error:
```json
{
  "error": "Error message",
  "details": ["Additional details"]
}
```

## 🔒 Security Features

✅ JWT-based authentication
✅ Password hashing (bcryptjs)
✅ Role-based access control
✅ Input validation (Zod)
✅ Protected routes
✅ CORS enabled
✅ Error handling

## 📝 License

ISC

## 👤 Author

Hamza Khan

---

**Status**: Production Ready ✅
