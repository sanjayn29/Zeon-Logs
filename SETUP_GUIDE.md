# 🚀 Zeon Backend Setup - Complete Guide

## ✅ What's Already Done

1. ✅ Python FastAPI backend created at `backend/main.py`
2. ✅ Frontend updated to connect to backend API
3. ✅ Dependencies installed (FastAPI, Pandas, Firebase Admin SDK)
4. ✅ Upload page now sends files to backend
5. ✅ Dashboard fetches and displays processed data

## 🔧 What You Need to Do

### Step 1: Get Firebase Service Account Key

1. Go to **[Firebase Console](https://console.firebase.google.com/project/zeon-cfc23/settings/serviceaccounts/adminsdk)**
2. Click **"Generate New Private Key"** button
3. Save the downloaded JSON file as `firebase_config.json` in the `backend` folder

**Important:** The file should be named exactly `firebase_config.json` and placed here:
```
Zeon-logs/
  backend/
    firebase_config.json  ← Put it here
    main.py
    requirements.txt
```

### Step 2: Start the Backend Server

**Option A: Double-click the batch file**
```
Double-click: start-backend.bat
```

**Option B: Run manually**
```cmd
cd backend
python main.py
```

The server will start at `http://localhost:8000`

You should see:
```
✅ Connected to Firebase Firestore
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 3: Test the Complete Flow

1. **Start Backend** (Port 8000)
   ```cmd
   start-backend.bat
   ```

2. **Start Frontend** (Port 5173 - should already be running)
   ```cmd
   npm run dev
   ```

3. **Test Upload:**
   - Go to `http://localhost:5173`
   - Sign in with Google
   - Go to **Upload** page
   - Drag & drop `Datasets/ocpp-log-1012-2.xlsx`
   - Click **"View Analysis"**
   - See stats on Dashboard!

## 🔍 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React)                                           │
│  - User uploads file on /upload page                        │
│  - Sends file + user email to backend                       │
│  - Fetches results on /dashboard page                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                          │
│  - Receives file at POST /process-file                      │
│  - Parses OCPP logs with Pandas                             │
│  - Extracts sessions (Preparing → Charging → Stop)          │
│  - Saves to Firestore "datas" collection                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Firebase Firestore                                         │
│  Collection: "datas"                                        │
│  Document: 1, 2, 3... (auto-increment)                      │
│  Fields:                                                    │
│    - user_email                                             │
│    - filename                                               │
│    - upload_time                                            │
│    - connector1_summary (Total, Successful, Failed)         │
│    - connector2_summary                                     │
│    - connector1_sessions (detailed session data)            │
│    - connector2_sessions                                    │
└─────────────────────────────────────────────────────────────┘
```

## 📊 API Endpoints

### 1. Process File
```http
POST http://localhost:8000/process-file
Content-Type: multipart/form-data

file: <Excel or CSV file>
user_email: <user email from auth>
data_source: cms (or s3)
```

### 2. Get User Data
```http
GET http://localhost:8000/user-data/{user_email}
```

### 3. Health Check
```http
GET http://localhost:8000/health
```

## 🐛 Troubleshooting

### Backend won't start
```
❌ Error: No module named 'fastapi'
```
**Solution:** Run `pip install -r backend/requirements.txt` in the backend folder

### Firebase connection failed
```
❌ Firebase initialization failed
```
**Solution:** Make sure `firebase_config.json` exists in the `backend` folder

### CORS Error
```
❌ Access to fetch blocked by CORS policy
```
**Solution:** Make sure backend is running on port 8000 (already configured in code)

### Upload fails
```
❌ Processing failed
```
**Solution:** 
1. Check backend logs in terminal
2. Make sure file is CSV or XLSX format
3. Verify Firebase is connected

## 📋 File Structure

```
Zeon-logs/
├── backend/
│   ├── main.py                  # FastAPI server (350 lines)
│   ├── requirements.txt         # Python dependencies
│   ├── firebase_config.json     # ← YOU NEED TO ADD THIS
│   └── README.md                # Backend documentation
├── src/
│   ├── pages/
│   │   ├── UploadPage.tsx      # Updated: sends to backend
│   │   └── DashboardPage.tsx   # Updated: fetches from backend
│   └── contexts/
│       └── AuthContext.tsx     # Provides user email
├── Datasets/
│   └── ocpp-log-1012-2.xlsx    # Sample log file for testing
└── start-backend.bat            # Quick start script
```

## 🎯 For Hackathon Judges

**Key Innovation:**
- We **don't store raw log files** anywhere
- Files are processed **in-memory** with Pandas
- Only **structured session insights** are saved to Firestore
- Each upload is linked to the authenticated user's email
- Sequential document IDs (1, 2, 3...) for easy tracking

**Tech Stack:**
- **Frontend:** React + TypeScript + Firebase Auth
- **Backend:** Python FastAPI + Pandas + Firebase Firestore
- **Processing:** In-memory OCPP log parsing (no file storage)
- **Security:** User authentication + email-based data isolation

## ✨ Next Steps (Optional Enhancements)

1. **Add session details view** - Click on a session to see full timeline
2. **Add charts** - Visualize sessions over time with Chart.js
3. **Add error analysis** - Show most common error codes
4. **Add export** - Download processed results as JSON/CSV
5. **Add notifications** - Email user when processing completes

---

**Need Help?** Check backend logs in the terminal where you ran `python main.py`
