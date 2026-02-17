# Zeon Backend - Python FastAPI Server

This backend processes OCPP charger log files and stores results in Firebase Firestore.

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (zeon-cfc23)
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the downloaded JSON file as `firebase_config.json` in this `backend` folder

### 3. Run the Server

```bash
python main.py
```

The server will start at `http://localhost:8000`

## API Endpoints

### POST /process-file
Upload and process OCPP log files

**Parameters:**
- `file`: CSV/Excel file with OCPP logs
- `user_email`: Email of the logged-in user
- `data_source`: "cms" (default) or "s3"

**Example:**
```bash
curl -X POST "http://localhost:8000/process-file" \
  -F "file=@ocpp-log-1012-2.xlsx" \
  -F "user_email=user@example.com" \
  -F "data_source=cms"
```

### GET /user-data/{user_email}
Get all uploaded logs for a specific user

**Example:**
```bash
curl "http://localhost:8000/user-data/user@example.com"
```

### GET /health
Check server health and Firebase connection status

## Firestore Structure

```
datas (collection)
├── 1 (document)
│   ├── user_email: "user@example.com"
│   ├── filename: "ocpp-log-1012-2.xlsx"
│   ├── upload_time: "2026-02-18T10:30:00"
│   ├── connector1_summary: { ... }
│   ├── connector2_summary: { ... }
│   ├── connector1_sessions: [ ... ]
│   └── connector2_sessions: [ ... ]
├── 2 (document)
│   └── ...
└── 3 (document)
    └── ...
```

## Key Differences from Friend's Project

✅ **What We Kept:**
- FastAPI framework
- Pandas for log processing
- In-memory file processing
- Session reconstruction logic

❌ **What We Changed:**
- MongoDB → Firebase Firestore
- Removed CP report complexity
- Simplified to ~350 lines (hackathon-ready)
- Added user email tracking
- Sequential document IDs

## For Judges

"We process OCPP log files directly in the backend using Python and Pandas.  
Raw files are never stored.  
Only structured session-level insights are saved in Firebase Firestore with user authentication."
