# Hotel Booking Backend API

Node.js backend API for the Hotel Booking System with authentication, email verification, and MongoDB.

## Features

- User registration with email verification
- Login with JWT authentication
- Password reset via email
- Email notifications using Gmail
- MongoDB database
- Secure password hashing with bcrypt
- Rate limiting and security headers

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- Gmail account for sending emails

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the values in `.env`

3. Gmail Setup for Email Notifications:
   - Go to your Google Account settings
   - Enable 2-Step Verification
   - Generate an App Password:
     - Go to Security > 2-Step Verification > App passwords
     - Select "Mail" and "Other (Custom name)"
     - Copy the generated 16-character password
     - Use this password in `EMAIL_PASSWORD` in `.env`

4. MongoDB Setup:
   - Install MongoDB locally OR
   - Create a free MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
   - Get your connection string and update `MONGODB_URI` in `.env`

## Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify-email/:token` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `PUT /api/auth/reset-password/:token` - Reset password
- `POST /api/auth/resend-verification` - Resend verification email
- `GET /api/auth/me` - Get current user (Protected)

### Health Check

- `GET /api/health` - Check server status

## Email Templates

The system sends three types of emails:

1. **Email Verification** - Sent after registration
2. **Password Reset** - Sent when user requests password reset
3. **Welcome Email** - Sent after email verification

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting (100 requests per 15 minutes)
- Helmet.js security headers
- CORS protection
- Input validation

## Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/hotel-booking
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=Hotel Booking <noreply@hotelbooking.com>
FRONTEND_URL=http://localhost:3001
```

## Testing with Postman

Import the API endpoints into Postman and test:

1. Register: POST http://localhost:5000/api/auth/register
2. Check your email for verification link
3. Verify email: GET http://localhost:5000/api/auth/verify-email/{token}
4. Login: POST http://localhost:5000/api/auth/login
5. Get user: GET http://localhost:5000/api/auth/me (with Bearer token)

## Troubleshooting

### Email not sending
- Check Gmail credentials
- Ensure App Password is used (not regular password)
- Check if 2-Step Verification is enabled
- Verify EMAIL_HOST and EMAIL_PORT are correct

### MongoDB connection error
- Ensure MongoDB is running locally
- Check MONGODB_URI is correct
- For Atlas, ensure IP whitelist is configured

### JWT errors
- Ensure JWT_SECRET is set in .env
- Check token format in Authorization header: `Bearer {token}`

## License

ISC
