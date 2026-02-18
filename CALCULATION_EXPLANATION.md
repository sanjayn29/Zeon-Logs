# 📊 How Dashboard Statistics are Calculated

## Simple Explanation of Each Metric

Let me explain how we calculate each statistic you see on the dashboard:

---

## 🔌 **Total Sessions (296)**

### What it is:
The total number of charging sessions found in all your uploaded log files.

### How we calculate it:
1. Look through the OCPP logs for `StartTransactionRequest` events
2. Each StartTransaction = 1 charging session
3. We count sessions from **both Connector 1 and Connector 2**
4. Add them all up across all your uploaded files

**Example:**
```
File 1: Connector1 = 17 sessions, Connector2 = 15 sessions
File 2: Connector1 = 12 sessions, Connector2 = 8 sessions
...more files...

Total = 17 + 15 + 12 + 8 + ... = 296 sessions
```

**Code (Frontend):**
```javascript
const totalSessions = data.reduce((sum, d) => 
  sum + d.connector1_summary["Total Sessions"] + d.connector2_summary["Total Sessions"], 0
);
```

---

## ✅ **Successful Sessions (199)**

### What it is:
Sessions that completed normally with actual charging.

### How we calculate it:
1. For each session, check if:
   - ✅ Has both Start and Stop Transaction
   - ✅ Duration > 1 minute 
   - ✅ Status changed to "Charging" during the session
   - ✅ No error codes (errorCode = "NoError")
2. Count how many sessions meet ALL these conditions

**Code (Backend):**
```python
# Inside build_sessions_enhanced function:
if errors:
    result = "Failed"
elif had_charging and duration_min > 1:
    result = "Successful"  # ← This one!
elif duration_min < 1:
    result = "Incomplete"
else:
    result = "Interrupted"

# Then count them:
"Successful Sessions": (sessions_df['result'] == "Successful").sum()
```

---

## ❌ **Failed Sessions (72)**

### What it is:
Sessions that encountered errors during charging.

### How we calculate it:
1. Look for `StatusNotificationRequest` events during each session
2. Check if `errorCode` is NOT "NoError"
3. If any error found → mark as "Failed"

**Common error codes:**
- GroundFailure
- OverCurrentFailure
- OverVoltage
- PowerMeterFailure
- etc.

---

## ⚠️ **Incomplete Sessions (22)**

### What it is:
Sessions that started but didn't complete properly.

### How we calculate it:
Count sessions where:
- Has StartTransaction BUT no matching StopTransaction
- OR duration < 1 minute

**Code:**
```python
if duration_min < 1:
    result = "Incomplete"
```

---

## ⚡ **Total Energy (244090.86 kWh)**

### What it is:
The total electrical energy delivered across all charging sessions.

### How we calculate it:
1. For EACH session:
   ```
   Energy (Wh) = meterStop - meterStart
   Energy (kWh) = Energy (Wh) / 1000
   ```

2. Example from ONE session:
   ```
   meterStart = 1000000 Wh  (from StartTransactionRequest)
   meterStop  = 1025000 Wh  (from StopTransactionRequest)
   
   Energy = 1025000 - 1000000 = 25000 Wh
          = 25000 / 1000 = 25 kWh
   ```

3. Add up ALL sessions from ALL files:
   ```
   Total Energy = Session1_energy + Session2_energy + ... + Session296_energy
   ```

**Code (Backend):**
```python
# Per session:
energy_wh = meter_stop - meter_start
energy_kwh = round(energy_wh / 1000, 2)

# Aggregate:
"Total Energy (kWh)": sessions_df['energy_kwh'].sum()
```

**Code (Frontend - combines all files):**
```javascript
const totalEnergy = data.reduce((sum, d) => 
  sum + d.connector1_summary["Total Energy (kWh)"] + 
        d.connector2_summary["Total Energy (kWh)"], 0
);
```

---

## ⏱️ **Average Duration (14.0 minutes)**

### What it is:
The average time a charging session lasts.

### How we calculate it:

**Step 1:** Calculate duration for each session
```
Duration (seconds) = Stop Time - Start Time
Duration (minutes) = Duration (seconds) / 60
```

**Example:**
```
Start Time: 2024-10-12 10:00:00
Stop Time:  2024-10-12 10:25:30

Duration = 25 minutes 30 seconds = 25.5 minutes
```

**Step 2:** Calculate average
```
Average Duration = Sum of all durations / Number of sessions
```

**Code (Backend):**
```python
duration_sec = (stop_time - start_time).total_seconds()
duration_min = round(duration_sec / 60, 1)

# Average:
"Average Duration (minutes)": sessions_df['duration_minutes'].mean()
```

**Code (Frontend - averages across files):**
```javascript
const totalDurationSum = data.reduce((sum, d) => 
  sum + d.connector1_summary["Average Duration (minutes)"] + 
        d.connector2_summary["Average Duration (minutes)"], 0
);
const avgDuration = totalDurationSum / (data.length * 2);
// Divide by (files × 2) because each file has 2 connectors
```

---

## 🔋 **Average Power (3999.91 kW)**

### What it is:
The average charging power across all sessions.

### How we calculate it:

**Formula:**
```
Power (kW) = Energy (kWh) / Duration (hours)
```

**Example from ONE session:**
```
Energy = 25 kWh
Duration = 0.5 hours (30 minutes)

Average Power = 25 kWh / 0.5 hours = 50 kW
```

**Then average all sessions:**
```
Average Power = Sum of all session powers / Number of sessions
```

**Code (Backend):**
```python
# Per session:
avg_power_kw = energy_kwh / duration_hrs if duration_hrs > 0 else 0

# Overall average:
"Average Power (kW)": sessions_df['avg_power_kw'].mean()
```

---

## 📈 **Peak Power (40.02 kW)**

### What it is:
The highest power recorded during any charging session.

### How we calculate it:
1. During charging, the charger sends `MeterValuesRequest` with real-time measurements
2. We extract the power value (in Watts) from these meter readings
3. Convert to kW: `Power (kW) = Power (W) / 1000`
4. Find the MAXIMUM power value across ALL sessions

**Code (Backend):**
```python
# Extract from MeterValues during session:
max_power = extract_meter_stats(meter_values)

# Find highest across all sessions:
"Peak Power (kW)": sessions_df['max_power_kw'].max()
```

**Code (Frontend - find max across all files):**
```javascript
const allPeakPowers = data.flatMap(d => [
  d.connector1_summary["Peak Power (kW)"],
  d.connector2_summary["Peak Power (kW)"]
]);
const peakPower = Math.max(...allPeakPowers);
```

---

## 📂 **How Multiple Files are Combined**

When you upload multiple files, the dashboard shows **aggregated** statistics:

```
Your Files:
├── File 1 (ocpp-log-1012-1.xlsx)
│   ├── Connector 1: 17 sessions, 300 kWh
│   └── Connector 2: 15 sessions, 250 kWh
│
└── File 2 (ocpp-log-1012-2.xlsx)
    ├── Connector 1: 12 sessions, 200 kWh
    └── Connector 2: 8 sessions, 150 kWh

Dashboard Totals:
- Total Sessions: 17 + 15 + 12 + 8 = 52
- Total Energy: 300 + 250 + 200 + 150 = 900 kWh
```

---

## 🔍 **How to Verify the Data is Real**

### 1. Check your OCPP log file
Open your Excel/CSV file and look for these columns:
- `command` - should include "StartTransactionRequest", "StopTransactionRequest"
- `payLoadData` - JSON with `meterStart`, `meterStop`, `connectorId`
- `real_time` - timestamps

### 2. Manual calculation example:
Pick one session from your logs:
```
Row 10: StartTransactionRequest
  - Time: 17/2/2026 10:00:00
  - meterStart: 1000000 Wh
  - connectorId: 1

Row 50: StopTransactionRequest
  - Time: 17/2/2026 10:30:00
  - meterStop: 1025000 Wh
  
YOUR CALCULATION:
- Duration = 30 minutes = 0.5 hours
- Energy = (1025000 - 1000000) / 1000 = 25 kWh
- Power = 25 kWh / 0.5 hours = 50 kW
```

This is EXACTLY what the backend does automatically for ALL sessions!

---

## 📊 **Data Flow Summary**

```
OCPP Log File (Excel/CSV)
         ↓
Backend Processing (main.py)
  - Extract Start/Stop Transactions
  - Calculate per-session metrics
  - Aggregate into summaries
         ↓
Firebase Database (datas collection)
  - Stores: connector1_summary, connector2_summary
         ↓
Dashboard (DashboardPage.tsx)
  - Fetches user data
  - Combines all files
  - Displays totals
         ↓
YOU SEE: 296 sessions, 244090.86 kWh, etc.
```

---

## 🎯 **Key Takeaways**

1. **Real Data**: All numbers come from actual OCCP log events (StartTransaction, StopTransaction, MeterValues)

2. **No Magic**: Every calculation is from OCPP protocol standards:
   - Energy = meter difference
   - Duration = time difference
   - Power = energy / time

3. **Verified**: You can manually check any session in your original Excel file!

4. **Combined**: Dashboard shows totals across ALL your uploaded files and BOTH connectors

---

## 💡 **Want to See Individual Sessions?**

The backend also stores detailed session data:
- Each session's start/end time
- Individual energy, power, duration
- Error codes if any
- Status changes

This is stored in `connector1_sessions` and `connector2_sessions` in the database.

Would you like me to create a page to view individual session details? 🤔
