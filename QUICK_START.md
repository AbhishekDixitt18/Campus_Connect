# 🚀 Campus Connect - Quick Start Guide

## System Status

✅ **Backend Server**: Running on `http://localhost:4000`  
✅ **Frontend Server**: Running on `http://localhost:5500`  
✅ **Database**: SQLite (`Backend/auth.db`)

---

## 🎯 What Was Fixed

### Login/Signup Issues (ROOT CAUSES IDENTIFIED & FIXED)

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| Login always fails | Oracle procedures don't exist | Rebuilt with SQLite + direct queries |
| Signup partially works | Inconsistent database schema | Created comprehensive users table |
| Database connection errors | Mismatched config | Unified to SQLite only |
| Token invalid | JWT validation issues | Rebuilt auth middleware |
| Password not matching | No password hashing | Implemented bcryptjs (12 rounds) |

---

## ⚡ Quick Test

### Test Signup (1 minute)

1. Go to **http://localhost:5500/signup**
2. Fill the form:
   - **Role**: Student
   - **Full Name**: Test User
   - **Phone**: +911234567890
   - **Department**: Computer Science
   - **Program**: BCA
   - **Year**: 2nd Year
   - **Email**: testuser@university.edu
   - **Password**: Test@12345
   - **Confirm Password**: Test@12345
3. Click "Create account"
4. **Expected**: Redirected to dashboard ✅

### Test Login (1 minute)

1. Go to **http://localhost:5500/signin**
2. Enter:
   - **Email**: testuser@university.edu
   - **Password**: Test@12345
3. Click "Sign In"
4. **Expected**: Redirected to dashboard ✅

---

## 📁 File Structure (What Changed)

```
✨ NEW/UPDATED:
├── Backend/
│   ├── server.js                    ← Rebuilt (clean, working)
│   ├── services/authService.js      ← NEW (database layer)
│   ├── controllers/authController.js ← REBUILT (SQLite)
│   ├── routes/authRoutes.js         ← UPDATED (working)
│   ├── middleware/auth.js           ← UPDATED (working)
│   ├── .env                         ← Config (JWT_SECRET, etc)
│   └── auth.db                      ← SQLite database (auto-created)

✅ UNCHANGED:
└── Frontend/
    ├── app.jsx                      ← All UI preserved!
    ├── src/main.jsx
    ├── styles.css
    └── ... (all components unchanged)
```

---

## 🔑 Key Changes Summary

### 1. New AuthService Class (`services/authService.js`)
- Pure database abstraction
- `registerUser()` - handles signup
- `validateLogin()` - handles login
- Proper bcryptjs hashing (12 rounds)
- Error handling & validation

### 2. Rebuilt Server (`server.js`)
- Clean Express setup
- SQLite database initialization
- Routes mounted with AuthService
- Health check endpoints
- Proper error handling

### 3. Updated Auth Controller
- Works with AuthService (not Oracle procedures)
- Proper JWT token generation
- Better error messages
- Protected route handlers

### 4. Auth Middleware
- JWT token extraction from Authorization header
- Token signature verification
- User info attached to request
- Role-based access control

---

## 🎨 Frontend - NO CHANGES NEEDED

The frontend already has:
✅ Correct API endpoints  
✅ Token storage in localStorage  
✅ Authorization header injection  
✅ Login/signup logic  
✅ Protected route guards  

**All UI/UX preserved exactly as before!**

---

## 📊 Authentication Flow

```
SIGNUP
------
1. User fills form (email, password, role, etc)
2. Frontend POST /api/auth/register
3. AuthService.registerUser():
   - Validates inputs
   - Checks if email exists
   - Hashes password with bcryptjs
   - Inserts into SQLite
4. Backend returns { token, user }
5. Frontend stores token in localStorage
6. Redirect to dashboard

LOGIN
-----
1. User enters email + password
2. Frontend POST /api/auth/login
3. AuthService.validateLogin():
   - Finds user by email
   - Compares password with bcrypt
4. Backend returns { token, user }
5. Frontend stores token in localStorage
6. All API requests include: Authorization: Bearer <token>
```

---

## 🔒 Security Implemented

✅ Passwords hashed with bcryptjs (12 rounds)  
✅ JWT tokens with 7-day expiration  
✅ CORS protection  
✅ Rate limiting on auth endpoints  
✅ SQL injection prevention (parameterized queries)  
✅ Timing-safe password comparison  

---

## 🧪 Test Different Scenarios

### Scenario 1: Valid Login
```
Email: testuser@university.edu
Password: Test@12345
Expected: ✅ Login successful, redirected to dashboard
```

### Scenario 2: Wrong Password
```
Email: testuser@university.edu
Password: WrongPassword
Expected: ❌ "Invalid email or password"
```

### Scenario 3: Non-existent Email
```
Email: nonexistent@university.edu
Password: Test@12345
Expected: ❌ "Invalid email or password"
```

### Scenario 4: Duplicate Signup
```
Try signup with same email again
Expected: ❌ "User with this email already exists"
```

### Scenario 5: Weak Password
```
Password: 123 (too short)
Expected: ❌ "Password must be at least 8 characters"
```

---

## 🛠️ Troubleshooting

### Backend won't start on port 4000
```bash
# Kill existing process
Get-NetTCPConnection -LocalPort 4000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }

# Restart
node server.js
```

### Database errors
```bash
# Delete old database and restart
rm Backend/auth.db
node server.js
```

### Login still fails
```bash
# Check .env file
cat Backend/.env | grep JWT_SECRET

# Should output something like:
# JWT_SECRET=campus_connect_local_jwt_secret_change_me
```

### Token invalid after long time
- Default expiration: 7 days
- Change with `JWT_EXPIRES_IN` in .env

---

## 📝 Environment Variables

Your `.env` file should have:

```env
PORT=4000
JWT_SECRET=campus_connect_local_jwt_secret_change_me
JWT_EXPIRES_IN=7d
FRONTEND_ORIGIN=http://127.0.0.1:5500,http://localhost:5500
OTP_PEPPER=campus_connect_local_otp_pepper_change_me
```

**⚠️ Change JWT_SECRET in production!**

---

## 🎓 For Developers

### Adding a new protected endpoint

```javascript
// In routes
router.get("/api/protected-route", authenticateToken, (req, res) => {
  const userId = req.user.sub;  // From JWT
  const role = req.user.role;    // From JWT
  // Your logic here
});
```

### Checking user role

```javascript
const { requireRole } = require("../middleware/auth");

router.post("/api/admin-only", 
  authenticateToken, 
  requireRole("admin"), 
  (req, res) => {
    // Only admins can access
  }
);
```

### Database queries

```javascript
// Use AuthService methods
const user = await authService.getUserById(userId);
const result = await authService.updateUserProfile(userId, updates);
```

---

## ✅ Verification Checklist

- [ ] Backend running on http://localhost:4000
- [ ] Frontend running on http://localhost:5500
- [ ] Can signup with new email
- [ ] Token stored in localStorage after signup
- [ ] Can logout
- [ ] Can login with correct password
- [ ] Login fails with wrong password
- [ ] Signup fails with existing email
- [ ] Protected routes require token
- [ ] UI looks same as before (no design changes)

---

## 📚 Full Documentation

See `AUTHENTICATION_REBUILD.md` for:
- Complete architecture overview
- Database schema details
- All API endpoints
- Security considerations
- Production recommendations

---

**Status: ✅ All systems operational**

Backend: http://localhost:4000  
Frontend: http://localhost:5500  
Database: SQLite (local)  

Ready for testing! 🚀
