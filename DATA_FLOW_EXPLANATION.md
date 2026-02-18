# 📊 Data Flow: Upload → Normalization → Dashboard

## Overview

This document explains how metrics are calculated and displayed across the application.

---

## 🔄 The Complete Flow

```
1. UPLOAD PAGE
   ↓ (Upload file)
   
2. BACKEND PROCESSING
   ↓ (Calculate metrics)
   
3. NORMALIZATION PAGE ⭐ 
   Shows: Metrics for THIS UPLOAD ONLY
   ↓
   
4. DASHBOARD PAGE ⭐
   Shows: CUMULATIVE metrics from ALL files
```

---

## 📤 Step 1: Upload Page

**What happens:**
- You select and upload an OCPP log file (CSV/Excel)
- File is sent to backend with your email
- Backend processes the file and stores to Firebase

**Backend Processing:**
```python
# When you upload a file:
1. Read the OCPP logs (StartTransaction, StopTransaction, MeterValues)
2. Calculate metrics for EACH connector:
   - Total Sessions
   - Successful/Failed/Incomplete Sessions
   - Total Energy (kWh)
   - Average Duration
   - Average Power
   - Peak Power
3. Store in Firebase with document ID
4. Return document ID to frontend
```

---

## ✅ Step 2: Normalization Page

### Purpose: Shows metrics for the file(s) you JUST uploaded

**Visual Indicators:**
- Badge: "This Upload Only" (green)
- Header: "Uploaded File Statistics"
- Subtitle: "Metrics for the file(s) you just uploaded"

**What you see:**
```
📊 Uploaded File Statistics [This Upload Only]
   Metrics for the file(s) you just uploaded

╔════════════════════════════════════════════════╗
║  Total Sessions: 17                            ║
║  Successful: 12                                ║
║  Failed: 1                                     ║
║  Incomplete: 4                                 ║
║                                                ║
║  Total Energy: 40,351.04 kWh                   ║
║  Avg Duration: 18.6 minutes                    ║
║  Avg Power: 13,006.79 kW                       ║
║  Peak Power: 23.24 kW                          ║
╚════════════════════════════════════════════════╝
```

**How it works:**
1. Gets document IDs for the files you just uploaded
2. Fetches ONLY those specific documents from Firebase
3. Calculates metrics for those files
4. If multiple files uploaded together → shows their combined stats

**Technical:**
```javascript
// Fetches by specific document IDs
fetchStatsByIds() → calls /get-by-ids endpoint
→ Returns metrics for uploaded files only
```

---

## 📈 Step 3: Dashboard Page

### Purpose: Shows CUMULATIVE metrics from ALL your uploaded files

**Visual Indicators:**
- Badge: "All X files combined" (primary color)
- Header: "Cumulative Statistics"
- Subtitle: "Total metrics aggregated from all your uploaded log files"
- Page description: "Cumulative performance overview from all X analyzed log files"

**What you see:**
```
📊 Cumulative Statistics [All 5 files combined]
   Total metrics aggregated from all your uploaded log files

╔════════════════════════════════════════════════╗
║  Total Sessions: 296                           ║
║  Successful: 199                               ║
║  Failed: 72                                    ║
║  Incomplete: 22                                ║
║                                                ║
║  Total Energy: 244,090.86 kWh                  ║
║  Avg Duration: 14.0 minutes                    ║
║  Avg Power: 3,999.91 kW                        ║
║  Peak Power: 40.02 kW                          ║
╚════════════════════════════════════════════════╝

📋 My Uploaded Files (5 total) • Sorted by most recent
   [List of all your files with individual stats]
```

**How it works:**
1. Fetches ALL files uploaded by you (user email)
2. Aggregates metrics across all files:
   - **Sessions:** Add up all sessions
   - **Energy:** Sum all energy
   - **Duration:** Average of all averages
   - **Power:** Average of all averages
   - **Peak Power:** Maximum across all files
3. Sorts by most recent upload first

**Technical:**
```javascript
// Fetches all user's data
fetchUserData() → calls /user-data/{email} endpoint
→ Returns ALL files for this user
→ Frontend aggregates the metrics

// Aggregation example:
totalSessions = File1.sessions + File2.sessions + ... + FileN.sessions
totalEnergy = File1.energy + File2.energy + ... + FileN.energy
```

---

## 🔍 Example Scenario

### You upload 3 files:

**File 1: ocpp-log-1012-1.xlsx**
- 17 sessions
- 40,351.04 kWh
- Avg Power: 13,006.79 kW

**File 2: ocpp-log-1012-2.xlsx**
- 25 sessions
- 55,200.00 kWh
- Avg Power: 18,500.00 kW

**File 3: ocpp-log-1012-3.xlsx**
- 30 sessions
- 62,000.00 kWh
- Avg Power: 20,000.00 kW

---

### What You See:

#### 🟢 Normalization Page (After File 1 upload)
```
Uploaded File Statistics [This Upload Only]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Sessions: 17
Total Energy: 40,351.04 kWh
Avg Power: 13,006.79 kW
```

#### 📊 Dashboard (After all 3 uploads)
```
Cumulative Statistics [All 3 files combined]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Sessions: 72  (17 + 25 + 30)
Total Energy: 157,551.04 kWh  (sum of all)
Avg Power: 17,168.93 kW  (average of averages)
```

---

## 🎯 Key Differences

| Feature | Normalization Page | Dashboard |
|---------|-------------------|-----------|
| **Shows** | This upload only | All uploads |
| **Badge** | "This Upload Only" (green) | "All X files combined" (blue) |
| **Data Source** | Specific document IDs | All user documents |
| **Purpose** | Verify your upload | Track overall progress |
| **Metrics Type** | Individual file(s) | Cumulative totals |
| **Calculation** | Direct from uploaded file | Aggregated from all files |

---

## 💡 Why Two Pages?

### Normalization Page
- **Immediate Feedback:** See what you just uploaded
- **Verification:** Confirm the file processed correctly
- **Individual Tracking:** Know each file's metrics

### Dashboard
- **Big Picture:** See your overall charging performance
- **Trend Analysis:** Track cumulative progress over time
- **Comparison:** Compare individual uploads in the file list

---

## 🔄 Complete User Journey

```
1. You upload "ocpp-log-1012-1.xlsx"
   ↓
2. Backend calculates:
   ✓ 17 sessions
   ✓ 40,351.04 kWh
   ✓ Stores as Document ID: 1
   ↓
3. NORMALIZATION PAGE shows:
   📄 This Upload: 17 sessions, 40,351 kWh
   ↓
4. Click "View Cumulative Dashboard"
   ↓
5. DASHBOARD shows:
   📊 All Files: 17 sessions, 40,351 kWh
   📋 My Files: 1 file listed
   ↓
6. You upload another file "ocpp-log-1012-2.xlsx"
   ↓
7. NORMALIZATION PAGE shows:
   📄 This Upload: 25 sessions, 55,200 kWh ← NEW upload only
   ↓
8. DASHBOARD now shows:
   📊 All Files: 42 sessions, 95,551 kWh ← CUMULATIVE
   📋 My Files: 2 files listed (sorted by newest first)
```

---

## 🛠️ Technical Implementation

### Backend Endpoints

**1. Process and Store**
```python
POST /process-file
- Receives: uploaded file
- Processes: calculates metrics
- Stores: in Firebase with document ID
- Returns: document_id, metrics
```

**2. Get Specific Upload (Normalization)**
```python
POST /get-by-ids
- Receives: [document_ids]
- Returns: metrics for those specific documents only
```

**3. Get All User Data (Dashboard)**
```python
GET /user-data/{email}
- Receives: user email
- Returns: ALL documents for that user
```

### Frontend Data Flow

**Normalization Page:**
```javascript
documentIds = [1, 2]  // from upload response
↓
fetch('/get-by-ids', { body: [1, 2] })
↓
Shows metrics for documents 1 and 2 only
```

**Dashboard Page:**
```javascript
userEmail = "user@example.com"
↓
fetch('/user-data/' + userEmail)
↓
data = [doc1, doc2, doc3, ..., docN]
↓
Aggregate all metrics
↓
Display cumulative totals
```

---

## ✅ Summary

- **Upload** → Backend calculates and stores
- **Normalization** → Shows THIS upload's metrics
- **Dashboard** → Shows ALL uploads' cumulative metrics

This two-stage approach gives you both immediate feedback AND long-term tracking! 🚀
