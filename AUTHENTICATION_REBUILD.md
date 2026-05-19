# Campus Connect - Authentication System Rebuild

## 📋 Overview

Successfully rebuilt the Campus Connect authentication system from scratch while preserving all frontend UI/UX design. The new system uses:

- **Backend**: Node.js + Express + SQLite3
- **Authentication**: JWT tokens + bcryptjs password hashing
- **Database**: SQLite with proper schema
- **Frontend**: React + Vite (unchanged, UI preserved)

---

## 🔍 Root Causes of Login Failures (DEBUGGED)

### Problem 1: Oracle Procedure Mismatch
- **Issue**: Backend tried to call Oracle stored procedures (`sp_register_user`, `sp_validate_login`) that didn't exist
- **Root Cause**: Mismatch between Oracle configuration and SQLite database setup
- **Solution**: Rebuilt entire auth layer to use SQLite with direct queries

### Problem 2: Database Schema Mismatch
- **Issue**: SQL queries referenced columns that didn't exist in the users table
- **Root Cause**: Old database schema was incomplete and fragmented
- **Solution**: Created comprehensive SQLite schema with all necessary columns

### Problem 3: Missing Error Handling
- **Issue**: Auth controller didn't properly validate user inputs or handle database errors
- **Root Cause**: Inconsistent promise handling and validation
- **Solution**: Implemented proper async/await with comprehensive error handling

### Problem 4: No Service Layer
- **Issue**: Database operations scattered across controller
- **Root Cause**: No separation of concerns
- **Solution**: Created dedicated `AuthService` class for all database operations

---

## 📁 File Structure

```
Backend/
├── .env                          # Environment variables
├── server.js                      # ✨ NEW - Clean Express server
├── package.json                   # Dependencies
├── auth.db                        # SQLite database (created on first run)
├── controllers/
│   └── authController.js         # ✨ REBUILT - Auth handlers
├── routes/
│   └── authRoutes.js             # ✨ UPDATED - Auth endpoints
├── middleware/
│   └── auth.js                   # ✨ UPDATED - JWT verification
├── services/
│   ├── authService.js            # ✨ NEW - Database operations
│   └── oracleService.js          # OLD - No longer used
├── config/
│   ├── oracle.js                 # OLD - No longer used
│   └── ...
└── sql/
    ├── schema.sql                # Reference only
    └── procedures.sql            # OLD - No longer used

Frontend/
├── app.jsx                        # ✅ UNCHANGED - All UI preserved
├── src/
│   ├── main.jsx                  # ✅ UNCHANGED
│   └── styles.css                # ✅ UNCHANGED
└── [rest unchanged]
```

---

## 🚀 New Architecture

### 1. AuthService (services/authService.js)
Core database abstraction layer providing:
- `registerUser()` - Create new user with bcrypt password hashing
- `validateLogin()` - Verify credentials and return user info
- `getUserById()` - Retrieve user by ID
- `updateUserProfile()` - Update user details
- `initializeDatabase()` - Create/initialize SQLite schema

### 2. Auth Controller (controllers/authController.js)
Request handlers:
- `register(req, res, authService)` - POST /api/auth/register
- `login(req, res, authService)` - POST /api/auth/login
- `getProfile(req, res, authService)` - GET /api/auth/profile (protected)
- `updateProfile(req, res, authService)` - PATCH /api/auth/profile (protected)

### 3. Auth Middleware (middleware/auth.js)
- `authenticateToken()` - Verify JWT token from Authorization header
- `requireRole()` - Check user role (student/organizer)

### 4. Clean Server (server.js)
- Express setup with CORS, JSON parsing
- SQLite initialization with AuthService
- Route mounting
- Graceful error handling
- Health check endpoints

---

## 🗄️ Database Schema

### users table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,        -- bcryptjs hashed
  role TEXT NOT NULL,                  -- 'student' or 'organizer'
  phone_number TEXT,
  account_type TEXT,
  program_or_unit TEXT,
  year_or_designation TEXT,
  department TEXT,
  first_name TEXT,
  last_name TEXT,
  reg_no TEXT,
  username TEXT UNIQUE,
  email_verified INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Additional tables created automatically:
- `events` - Event information
- `registrations` - User event registrations

---

## 🔐 Authentication Flow

### Signup Flow
```
1. User submits: fullName, email, password, role, phoneNumber, etc.
2. AuthService.registerUser():
   - Validate inputs
   - Check if email already exists
   - Hash password with bcryptjs (12 rounds)
   - Insert user into database
3. Create JWT token with user info
4. Return token + user data to frontend
5. Frontend stores token in localStorage
6. Frontend redirects to dashboard/organizer
```

### Login Flow
```
1. User submits: email, password
2. AuthService.validateLogin():
   - Find user by email
   - Compare password with bcrypt
   - Return user info if valid
3. Create JWT token with user info
4. Return token + user data to frontend
5. Frontend stores token in localStorage
6. Frontend redirects to appropriate dashboard
```

### Protected Routes Flow
```
1. Frontend sends request with: Authorization: Bearer <token>
2. authenticateToken() middleware:
   - Extract token from header
   - Verify JWT signature with JWT_SECRET
   - Attach user info to req.user
   - Pass to next handler
3. Route handler accesses req.user.sub (userId), req.user.role
4. If invalid/expired token, return 401 Unauthorized
```

---

## 📝 Environment Variables (.env)

```env
# Server
PORT=4000
NODE_ENV=development

# Frontend Origin (for CORS)
FRONTEND_ORIGIN=http://127.0.0.1:5500,http://localhost:5500

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars-long-2024
JWT_EXPIRES_IN=7d

# OTP Configuration (optional)
OTP_PEPPER=your-otp-pepper-key-for-hashing-min-16-chars-long-2024
REQUIRE_EMAIL_OTP=false

# Admin Configuration (optional)
ADMIN_EMAIL=admin@university.edu
ADMIN_PASSWORD=Admin@123
DEV_ADMIN_KEY=

# Email Configuration (optional - only if you want email OTP)
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_AUDIENCE_NAME=Campus Connect

# Database
DATABASE_PATH=./auth.db
```

**⚠️ IMPORTANT**: Change `JWT_SECRET` to a strong random string in production!

---

## 🎯 API Endpoints

### Public Endpoints

#### POST /api/auth/register
Register new user

**Request:**
```json
{
  "fullName": "John Doe",
  "email": "john@university.edu",
  "password": "SecurePassword123!",
  "role": "student",
  "phoneNumber": "+911234567890",
  "department": "Computer Science",
  "programOrUnit": "BCA",
  "yearOrDesignation": "2nd Year"
}
```

**Response (201):**
```json
{
  "message": "Registration successful",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "fullName": "John Doe",
    "email": "john@university.edu",
    "role": "student",
    "phoneNumber": "+911234567890"
  }
}
```

#### POST /api/auth/login
Login with credentials

**Request:**
```json
{
  "email": "john@university.edu",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "fullName": "John Doe",
    "email": "john@university.edu",
    "role": "student",
    "phoneNumber": "+911234567890"
  }
}
```

### Protected Endpoints

#### GET /api/auth/profile
Get current user profile (requires token)

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "fullName": "John Doe",
    "email": "john@university.edu",
    "role": "student",
    "phoneNumber": "+911234567890"
  }
}
```

#### PATCH /api/auth/profile
Update user profile (requires token)

**Request:**
```json
{
  "fullName": "John Updated",
  "phoneNumber": "+919876543210",
  "department": "IT"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "fullName": "John Updated",
    "email": "john@university.edu",
    "role": "student",
    "phoneNumber": "+919876543210"
  }
}
```

---

## 🏃 How to Run

### Backend Setup

1. **Navigate to Backend directory:**
   ```bash
   cd Backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Verify .env file exists** with correct JWT_SECRET

4. **Start the server:**
   ```bash
   npm start
   ```
   or
   ```bash
   node server.js
   ```

   **Output should show:**
   ```
   🚀 Campus Connect Auth API running on http://localhost:4000
   📝 Environment: development
   🗄️  Database: ./auth.db
   
   ✅ Server is ready for requests
   ```

### Frontend Setup

1. **Navigate to Frontend directory:**
   ```bash
   cd Frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start dev server:**
   ```bash
   npm run dev
   ```

   **Output should show:**
   ```
   VITE v6.3.5  ready in XXX ms
   ➜  Local:   http://localhost:5500/
   ```

### Access the Application

- **Frontend**: http://localhost:5500
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/api/health

---

## ✅ Testing the Authentication

### Test Signup

1. Open http://localhost:5500
2. Click "Sign up"
3. Complete multi-step form:
   - Step 1: Select "Student" or "Organizer"
   - Step 2: Enter personal details
   - Step 3: Enter email and password
4. Click "Create account"
5. Should redirect to dashboard with token stored

### Test Login

1. Open http://localhost:5500/signin
2. Enter test credentials:
   - Email: The email used in signup
   - Password: The password used in signup
3. Click "Sign In"
4. Should redirect to dashboard/organizer with token stored

### Test Protected Routes

1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Verify `cc_token` exists
4. Check that token is valid JWT format (3 parts separated by dots)

### Test Invalid Login

1. Try login with wrong password
2. Should show error: "Invalid email or password"
3. No token should be created

---

## 🐛 Troubleshooting

### Issue: Port 4000 already in use

**Solution:**
```bash
# PowerShell
Get-NetTCPConnection -LocalPort 4000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
node server.js

# Or change PORT in .env
PORT=5000
```

### Issue: "Missing JWT_SECRET"

**Solution:**
```bash
# Check .env file exists and has JWT_SECRET
cat .env | grep JWT_SECRET

# If not, add it:
echo "JWT_SECRET=your-secret-key-here" >> .env
```

### Issue: Database locked error

**Solution:**
```bash
# Delete the database and let it reinitialize
rm Backend/auth.db
npm start
```

### Issue: Token invalid/expired

**Solution:**
- Check `JWT_EXPIRES_IN` in .env (default: 7d)
- Clear localStorage and signup again
- Verify `JWT_SECRET` hasn't changed

### Issue: Login returns "no such column"

**Solution:**
```bash
# This means database schema is mismatched
# Delete old database and restart server
rm Backend/auth.db
npm start
```

---

## 📦 Dependencies Used

### Backend (package.json)
- `express` - Web framework
- `cors` - Cross-origin requests
- `bcryptjs` - Password hashing (v2.4.3+)
- `jsonwebtoken` - JWT tokens
- `dotenv` - Environment variables
- `sqlite3` - Database driver
- `express-rate-limit` - Rate limiting (optional)

### Frontend (package.json)
- `react` - UI library
- `react-dom` - DOM rendering
- `react-router-dom` - Routing
- `axios` - HTTP client
- `tailwindcss` - Styling
- `vite` - Build tool

---

## 🔒 Security Features

✅ **Implemented:**
- Passwords hashed with bcryptjs (12 rounds)
- JWT tokens with expiration (7 days default)
- CORS protection
- Rate limiting on auth endpoints
- SQL injection prevention (parameterized queries)
- Timing-safe password comparison
- Token stored in Authorization header (not URL/cookie vulnerable)

⚠️ **Production Considerations:**
- Use HTTPS only in production
- Rotate JWT_SECRET regularly
- Implement token refresh mechanism
- Add email verification step
- Add password reset functionality
- Use environment-specific .env files
- Enable CORS only for trusted origins
- Implement rate limiting per IP
- Add logging and monitoring

---

## 📖 Frontend API Integration

The frontend (app.jsx) already handles:
- ✅ Axios instance with Authorization header injection
- ✅ Token storage in localStorage
- ✅ User data normalization
- ✅ Protected route guards
- ✅ Logout functionality
- ✅ Auto-redirect to login if token missing

**No frontend changes needed!** The UI is completely preserved.

---

## 🎨 UI/UX Preserved

All original design elements maintained:
- ✅ Teal gradient buttons (#169f91 to #36cfc0)
- ✅ Multi-step signup form layout
- ✅ Hero image sections
- ✅ Form validation messages
- ✅ Dark mode support
- ✅ Responsive design
- ✅ All animations and transitions
- ✅ Card designs and spacing
- ✅ Typography and colors

---

## 📋 Summary of Changes

### ✨ NEW Files Created:
1. `Backend/services/authService.js` - Database abstraction layer
2. `Backend/server-new.js` (renamed to `server.js`) - Clean Express server

### 🔄 UPDATED Files:
1. `Backend/controllers/authController.js` - Rebuilt for SQLite + AuthService
2. `Backend/routes/authRoutes.js` - Updated to inject AuthService
3. `Backend/middleware/auth.js` - Improved JWT verification
4. `Backend/.env` - Already exists with correct config

### ❌ DEPRECATED (No longer used):
1. `Backend/services/oracleService.js` - Oracle procedures removed
2. `Backend/config/oracle.js` - Oracle config no longer needed
3. `Backend/server-old.js` - Old server backed up

### ✅ UNCHANGED:
- All Frontend files (React, Vite, Tailwind)
- All UI components and styling
- All business logic
- API response format compatibility

---

## 🎓 How It Works

### Complete Flow Diagram

```
User visits http://localhost:5500
         ↓
    Checks localStorage for token
         ↓
    No token? → Redirect to /signin
         ↓
User enters email/password
         ↓
Frontend POST /api/auth/login
         ↓
Backend validates credentials:
  - Find user by email
  - bcrypt.compare(password, hash)
         ↓
Generate JWT token:
  - sub: userId
  - email: email
  - role: role
  - Expires in 7 days
         ↓
Return { token, user }
         ↓
Frontend stores token in localStorage
Frontend stores user data in localStorage
         ↓
Frontend redirects to /dashboard (or /organizer)
         ↓
Dashboard requests GET /api/events
Adds: Authorization: Bearer <token>
         ↓
Backend authenticateToken middleware:
  - Extracts token
  - jwt.verify(token, JWT_SECRET)
  - Attaches user to req
         ↓
Route handler executes
Returns event data
         ↓
Frontend displays dashboard
```

---

## ✨ Next Steps (Optional Enhancements)

1. **Email Verification**
   - Send OTP on signup
   - Verify before account activation

2. **Password Reset**
   - Forgot password endpoint
   - Email verification link

3. **Token Refresh**
   - Refresh token endpoint
   - Silent token renewal

4. **Social Login**
   - Google OAuth
   - GitHub OAuth

5. **Two-Factor Authentication**
   - SMS/Email OTP
   - Authenticator app support

6. **Admin Dashboard**
   - User management
   - Event management
   - Analytics

---

## 📞 Support

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Verify both servers are running on ports 4000 and 5500
3. Check browser console for frontend errors
4. Check terminal for backend errors
5. Verify .env file has all required variables
6. Clear browser localStorage and try again

---

**Built with ❤️ for Campus Connect**
*All UI design preserved. Authentication rebuilt from scratch.*
