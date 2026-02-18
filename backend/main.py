from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import json
import io
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, firestore
import os

# =====================================================
# FIREBASE INITIALIZATION
# =====================================================
try:
    # Initialize Firebase Admin SDK
    cred = credentials.Certificate("firebase_config.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Connected to Firebase Firestore")
except Exception as e:
    print(f"❌ Firebase initialization failed: {e}")
    db = None

# =====================================================
# FASTAPI APP
# =====================================================
app = FastAPI(title="Zeon Backend API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8081", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to Zeon Backend API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "firebase": db is not None}


@app.get("/test-process")
async def test_process():
    """Test endpoint to verify processing works"""
    import os
    try:
        # Try to process the sample file
        file_path = os.path.join("..", "Datasets", "ocpp-log-1012-2.xlsx")
        if os.path.exists(file_path):
            df = pd.read_excel(file_path)
            result = process_ocpp_logs(df)
            return {
                "status": "success",
                "file": "ocpp-log-1012-2.xlsx",
                "rows": len(df),
                "connector1_summary": result["report_1"],
                "connector2_summary": result["report_2"],
            }
        else:
            return {"status": "error", "message": "Sample file not found"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# =====================================================
# FILE UPLOAD & PROCESSING ENDPOINT
# =====================================================
@app.post("/process-file")
async def process_file(
    file: UploadFile = File(...), 
    user_email: str = Form(...),
    data_source: str = Form("cms")
):
    """
    Process uploaded OCPP log file and store in Firestore
    
    Parameters:
    - file: CSV/Excel file with OCPP logs
    - user_email: Email of logged-in user
    - data_source: "cms" or "s3" (s3 reverses row order)
    """
    
    if db is None:
        raise HTTPException(status_code=503, detail="Firebase not connected")
    
    try:
        # Read file
        contents = await file.read()
        ext = file.filename.split('.')[-1].lower()
        
        if ext == 'csv':
            df = pd.read_csv(io.BytesIO(contents))
        elif ext in ['xlsx', 'xls']:
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        print(f"📊 Processing {file.filename} - Shape: {df.shape}")
        
        # Reverse row order for S3 data
        if data_source.lower() == "s3":
            df = df.iloc[::-1].reset_index(drop=True)
            print("🔄 Reversed row order for S3 data")
        
        # Process the file
        result = process_ocpp_logs(df)
        
        # Get next document ID
        next_id = get_next_document_id()
        
        # Prepare Firestore document
        doc_data = {
            "user_email": user_email,
            "filename": file.filename,
            "upload_time": datetime.utcnow().isoformat(),
            "data_source": data_source,
            "connector1_summary": result["report_1"],
            "connector2_summary": result["report_2"],
            "connector1_sessions": json.loads(result["Connector1"]) if isinstance(result["Connector1"], str) else result["Connector1"],
            "connector2_sessions": json.loads(result["Connector2"]) if isinstance(result["Connector2"], str) else result["Connector2"],
        }
        
        # Save to Firestore
        db.collection("datas").document(str(next_id)).set(doc_data)
        print(f"✅ Saved to Firestore with ID: {next_id}")
        
        # Return response
        return JSONResponse(content={
            "status": "success",
            "document_id": next_id,
            "user_email": user_email,
            "connector1": json.loads(result["Connector1"]) if isinstance(result["Connector1"], str) else result["Connector1"],
            "connector2": json.loads(result["Connector2"]) if isinstance(result["Connector2"], str) else result["Connector2"],
            "summary": {
                "connector1": result["report_1"],
                "connector2": result["report_2"]
            }
        })
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


# =====================================================
# GET USER'S UPLOADED DATA
# =====================================================
@app.get("/user-data/{user_email}")
async def get_user_data(user_email: str):
    """Get all uploaded data for a specific user"""
    
    if db is None:
        raise HTTPException(status_code=503, detail="Firebase not connected")
    
    try:
        # Query Firestore for user's documents
        docs = db.collection("datas").where("user_email", "==", user_email).stream()
        
        user_data = []
        for doc in docs:
            data = doc.to_dict()
            data["document_id"] = doc.id
            user_data.append(data)
        
        return JSONResponse(content={
            "status": "success",
            "user_email": user_email,
            "total_uploads": len(user_data),
            "data": user_data
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# =====================================================
# GET ALL DATA FROM DATAS COLLECTION
# =====================================================
@app.get("/all-data")
async def get_all_data():
    """Get all uploaded data from datas collection"""
    
    if db is None:
        raise HTTPException(status_code=503, detail="Firebase not connected")
    
    try:
        # Query Firestore for all documents
        docs = db.collection("datas").stream()
        
        all_data = []
        for doc in docs:
            data = doc.to_dict()
            data["document_id"] = doc.id
            all_data.append(data)
        
        return JSONResponse(content={
            "status": "success",
            "total_uploads": len(all_data),
            "data": all_data
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# =====================================================
# GET DATA BY DOCUMENT IDS
# =====================================================
@app.post("/get-by-ids")
async def get_data_by_ids(document_ids: list[str]):
    """Get data for specific document IDs"""
    
    if db is None:
        raise HTTPException(status_code=503, detail="Firebase not connected")
    
    try:
        data_list = []
        for doc_id in document_ids:
            doc_ref = db.collection("datas").document(str(doc_id))
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                data["document_id"] = doc.id
                data_list.append(data)
        
        return JSONResponse(content={
            "status": "success",
            "total": len(data_list),
            "data": data_list
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# =====================================================
# DELETE LOG BY DOCUMENT ID
# =====================================================
@app.delete("/delete-log/{document_id}")
async def delete_log(document_id: str):
    """Delete a specific log document from Firestore"""
    
    if db is None:
        raise HTTPException(status_code=503, detail="Firebase not connected")
    
    try:
        doc_ref = db.collection("datas").document(document_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail=f"Log with ID {document_id} not found")

        doc_ref.delete()
        print(f"✅ Deleted from Firestore with ID: {document_id}")
        
        return JSONResponse(content={
            "status": "success",
            "message": f"Log {document_id} deleted successfully"
        })
        
    except Exception as e:
        print(f"❌ Error deleting log: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# =====================================================
# HELPER FUNCTIONS
# =====================================================
def get_next_document_id():
    """Get next sequential document ID"""
    try:
        # Get all documents
        docs = db.collection("datas").stream()
        doc_ids = [int(doc.id) for doc in docs if doc.id.isdigit()]
        
        if not doc_ids:
            return 1
        
        return max(doc_ids) + 1
    except:
        return 1


def normalize_other_error(error_code, info, vendor_error):
    """
    Enrich OtherError with meaningful sub-reason
    Does NOT modify original errorCode - only adds context
    """
    if error_code != "OtherError":
        return None

    text = " ".join([
        str(info or ""),
        str(vendor_error or "")
    ]).lower()

    # Vehicle / protocol related
    if "vehicleprotocolerror" in text or "evstopabnrml" in text:
        return "VehicleProtocolError"

    # Communication issues
    if "communication" in text or "timeout" in text:
        return "EVCommunicationFailure"

    # Power / electrical
    if "overcurrent" in text:
        return "OverCurrentDetected"

    if "undervoltage" in text:
        return "UnderVoltageDetected"

    # User / EV behavior
    if "evdisconnected" in text:
        return "EVDisconnectedUnexpectedly"

    # Charger internal
    if "internal" in text:
        return "ChargerInternalError"

    return "UnclassifiedOtherError"


def is_precharging_failure(session_row):
    """
    Pre-charging failure detection:
    - Session started but never reached Charging status
    - Duration is very short (< 1 minute)
    - Not classified as Successful
    - No real errors (indicates handshake/preparation issue)
    """
    return (
        session_row.get("result") not in ["Successful"] and
        session_row.get("duration_minutes", 0) < 1 and
        session_row.get("errors") in ["None", "", None]
    )


def detect_idle_time_errors(df, sessions_df):
    """
    Detect errors that occur OUTSIDE charging sessions.
    These are idle-time charger / EV / firmware issues.
    
    Features:
    - STRICT filtering of non-actionable errors
    - Status-aware deduplication (treats same idle episode as one incident)
    - Session + 2-minute post-session exclusion
    - Categorization into warnings vs faults
    """
    
    if df.empty or sessions_df.empty:
        return {"warnings": [], "faults": [], "all_errors": [], "total_count": 0}
    
    # Strict ignore list - non-actionable values
    IGNORE_IDLE_ERRORS = [
        "NoError",
        "None",
        "nan",
        "",
        None,
        "Available",
        "Preparing",
        "StatusNotification"
    ]
    
    # Convert session time ranges to datetime + add 2-minute buffer after session end
    session_ranges = []
    for _, s in sessions_df.iterrows():
        try:
            start = pd.to_datetime(s["start_time"])
            end = pd.to_datetime(s["end_time"])
            # Add 2-minute window after session to exclude stop-transaction spillover
            end_with_buffer = end + timedelta(minutes=2)
            session_ranges.append((start, end_with_buffer))
        except:
            continue
    
    def is_inside_any_session(ts):
        """Check if timestamp is inside any session (including 2-min post-session buffer)"""
        for start, end_with_buffer in session_ranges:
            if start <= ts <= end_with_buffer:
                return True
        return False
    
    # Look only at StatusNotificationRequest (where idle errors usually appear)
    status_rows = df[df["command"] == "StatusNotificationRequest"]
    
    raw_errors = []
    
    for _, row in status_rows.iterrows():
        ts = row.get("real_datetime")
        if pd.isna(ts):
            continue
        
        # Skip if inside a session (including 2-min post-session buffer)
        if is_inside_any_session(ts):
            continue
        
        payload = row.get("payload_json", {})
        error_code = payload.get("errorCode")
        info = payload.get("info")
        vendor_error = payload.get("vendorErrorCode")
        connector_id = payload.get("connectorId", 0)
        status = payload.get("status")
        
        # Convert None to string for comparison
        error_code_str = str(error_code) if error_code is not None else ""
        info_str = str(info) if info is not None else ""
        vendor_error_str = str(vendor_error) if vendor_error is not None else ""
        
        # STRICT FILTERING: Reject unless at least ONE real field exists
        # Check if ALL fields are in ignore list
        error_code_ignored = error_code in IGNORE_IDLE_ERRORS or error_code_str in ["", "None", "nan"]
        info_ignored = info in IGNORE_IDLE_ERRORS or info_str in ["", "None", "nan"]
        vendor_error_ignored = vendor_error in IGNORE_IDLE_ERRORS or vendor_error_str in ["", "None", "nan"]
        
        if error_code_ignored and info_ignored and vendor_error_ignored:
            # All fields are empty/ignored - skip this row
            continue
        
        # Enrich OtherError with sub-reason
        display_error = error_code
        if error_code == "OtherError":
            sub_error = normalize_other_error(error_code, info, vendor_error)
            display_error = f"OtherError:{sub_error}"
        
        raw_errors.append({
            "timestamp": ts,
            "timestamp_str": ts.strftime("%Y-%m-%d %H:%M:%S"),
            "status": status,
            "errorCode": display_error,
            "info": info,
            "vendorErrorCode": vendor_error,
            "connectorId": connector_id,
            "signature": (error_code_str, info_str, vendor_error_str, connector_id)
        })
    
    # STATUS-AWARE DEDUPLICATION (idle episode detection)
    deduped_errors = []
    seen = {}  # signature -> (last_timestamp, last_status)
    
    # Sort by timestamp
    raw_errors.sort(key=lambda x: x["timestamp"])
    
    for error in raw_errors:
        sig = error["signature"]
        ts = error["timestamp"]
        
        # Check if we've seen this signature recently
        if sig in seen:
            last_ts, last_status = seen[sig]
            time_diff_seconds = (ts - last_ts).total_seconds()
            
            # If same error + same status, treat as SAME idle incident (30-min window)
            if time_diff_seconds < 1800 and error["status"] == last_status:
                # Skip duplicate - same idle episode
                continue
        
        # New or sufficiently different error - add it
        seen[sig] = (ts, error["status"])
        
        # Categorize: warnings vs faults
        is_warning = (
            error["status"] in ["Available", "Preparing", "Finishing"] and
            error["errorCode"] and 
            not error["errorCode"].startswith("OtherError")
        )
        
        error_entry = {
            "timestamp": error["timestamp_str"],
            "status": error["status"],
            "errorCode": error["errorCode"],
            "info": error["info"],
            "vendorErrorCode": error["vendorErrorCode"],
            "connectorId": error["connectorId"],
            "category": "warning" if is_warning else "fault"
        }
        
        deduped_errors.append(error_entry)
    
    # Separate into warnings and faults
    warnings = [e for e in deduped_errors if e.get("category") == "warning"]
    faults = [e for e in deduped_errors if e.get("category") == "fault"]
    
    return {
        "warnings": warnings,
        "faults": faults,
        "all_errors": deduped_errors,
        "total_count": len(deduped_errors)
    }


def collapse_idle_error_episodes(idle_errors, window_minutes=30):
    """
    Collapse repeated idle errors into single incidents.
    Same connector + same error fields within window → ONE error.
    
    This prevents counting the same idle fault repeatedly (e.g., firmware spam,
    status heartbeats) and instead treats each continuous episode as a single incident.
    """
    if not idle_errors:
        return []

    collapsed = []
    last_seen = {}

    for err in idle_errors:
        # Build signature (friend-style)
        sig = (
            err.get("connectorId"),
            err.get("errorCode"),
            err.get("info"),
            err.get("vendorErrorCode"),
        )

        ts = pd.to_datetime(err.get("timestamp"), errors="coerce")

        if sig in last_seen:
            prev_ts = last_seen[sig]
            if pd.notna(ts) and pd.notna(prev_ts):
                if (ts - prev_ts).total_seconds() < window_minutes * 60:
                    # Same idle incident → SKIP
                    continue

        last_seen[sig] = ts
        collapsed.append(err)

    return collapsed


def json_safe(obj):
    """Convert numpy types to Python types for JSON serialization"""
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    if isinstance(obj, dict):
        return {k: json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [json_safe(v) for v in obj]
    return obj


# =====================================================
# ENHANCED OCPP LOG PROCESSING
# =====================================================
def process_ocpp_logs(df):
    """
    Enhanced OCPP log processing - extracts ALL real metrics from logs
    """
    
    # Parse datetime columns
    df['real_datetime'] = pd.to_datetime(df['real_time'], format="mixed", dayfirst=True, errors="coerce")
    
    # Parse JSON payLoadData
    df['payload_json'] = df['payLoadData'].apply(lambda x: json.loads(x) if isinstance(x, str) else {})
    
    # Extract connector IDs
    df['connectorId'] = df['payload_json'].apply(lambda x: x.get('connectorId', 0))
    
    # Separate by connector
    df1 = df[df['connectorId'].isin([1, 0])].copy()
    df2 = df[df['connectorId'].isin([2, 0])].copy()
    
    # Build sessions for each connector
    sessions_c1, metrics_c1 = build_sessions_enhanced(df1)
    sessions_c2, metrics_c2 = build_sessions_enhanced(df2)
    
    return {
        "Connector1": sessions_c1.to_json(orient='records', indent=2) if not sessions_c1.empty else "[]",
        "Connector2": sessions_c2.to_json(orient='records', indent=2) if not sessions_c2.empty else "[]",
        "report_1": json_safe(metrics_c1),
        "report_2": json_safe(metrics_c2)
    }


def build_sessions_enhanced(df):
    """Build charging sessions with detailed metrics from OCPP logs"""
    
    if df.empty:
        return pd.DataFrame(), {
            "Total Sessions": 0,
            "Successful Sessions": 0,
            "Successful Session Errors": {},
            "Failed Sessions": 0,
            "Failed Session Reasons": {},
            "Incomplete Sessions": 0,
            "Total Energy (kWh)": 0,
            "Total Duration (hours)": 0,
            "Average Power (kW)": 0,
        }
    
    # Extract Start and Stop transactions
    start_txns = df[df['command'] == 'StartTransactionRequest'].copy()
    stop_txns = df[df['command'] == 'StopTransactionRequest'].copy()
    status_changes = df[df['command'] == 'StatusNotificationRequest'].copy()
    
    sessions = []
    
    # Match Start and Stop transactions
    for idx, start_row in start_txns.iterrows():
        payload = start_row['payload_json']
        connector_id = payload.get('connectorId', 0)
        meter_start = payload.get('meterStart', 0)
        start_time = start_row['real_datetime']
        id_tag = payload.get('idTag', 'Unknown')
        
        # Find corresponding stop transaction
        stop_matching = stop_txns[stop_txns['real_datetime'] > start_time]
        
        if not stop_matching.empty:
            stop_row = stop_matching.iloc[0]
            stop_payload = stop_row['payload_json']
            meter_stop = stop_payload.get('meterStop', meter_start)
            stop_time = stop_row['real_datetime']
            transaction_id = stop_payload.get('transactionId', 'N/A')
            reason = stop_payload.get('reason', 'Normal')
            
            # Calculate metrics
            energy_wh = meter_stop - meter_start
            energy_kwh = round(energy_wh / 1000, 2) if energy_wh > 0 else 0
            duration_sec = (stop_time - start_time).total_seconds()
            duration_min = round(duration_sec / 60, 1)
            duration_hrs = round(duration_sec / 3600, 2)
            avg_power_kw = round(energy_kwh / duration_hrs, 2) if duration_hrs > 0 else 0
            
            # Get status changes during this session
            session_statuses = status_changes[
                (status_changes['real_datetime'] >= start_time) & 
                (status_changes['real_datetime'] <= stop_time)
            ]
            
            # Check for errors
            errors = []
            had_charging = False
            for _, status_row in session_statuses.iterrows():
                status_payload = status_row['payload_json']
                error_code = status_payload.get('errorCode', 'NoError')
                status = status_payload.get('status', '')
                
                if error_code != 'NoError':
                    # Enrich OtherError with meaningful sub-reason
                    if error_code == "OtherError":
                        sub_error = normalize_other_error(
                            error_code,
                            status_payload.get("info"),
                            status_payload.get("vendorErrorCode")
                        )
                        errors.append(f"OtherError:{sub_error}")
                    else:
                        errors.append(error_code)
                if status == 'Charging':
                    had_charging = True
            
            # Determine result
            if errors:
                result = "Failed"
            elif had_charging and duration_min > 1:
                result = "Successful"
            elif duration_min < 1:
                result = "Incomplete"
            else:
                result = "Interrupted"
            
            # Get meter values (voltage, current, power) during session
            meter_values = df[
                (df['command'] == 'MeterValuesRequest') &
                (df['real_datetime'] >= start_time) &
                (df['real_datetime'] <= stop_time) &
                (df['connectorId'] == connector_id)
            ]
            
            avg_voltage, avg_current, max_power = extract_meter_stats(meter_values)
            
            session = {
                "transactionId": transaction_id,
                "start_time": start_time.strftime('%Y-%m-%d %H:%M:%S'),
                "end_time": stop_time.strftime('%Y-%m-%d %H:%M:%S'),
                "duration_minutes": duration_min,
                "duration_hours": duration_hrs,
                "energy_kwh": energy_kwh,
                "meter_start_wh": meter_start,
                "meter_stop_wh": meter_stop,
                "avg_power_kw": avg_power_kw,
                "max_power_kw": max_power,
                "avg_voltage_v": avg_voltage,
                "avg_current_a": avg_current,
                "id_tag": id_tag,
                "reason": reason,
                "errors": ", ".join(set(errors)) if errors else "None",
                "result": result,
            }
            sessions.append(session)
        else:
            # Incomplete session (no stop transaction found)
            session = {
                "transactionId": "N/A",
                "start_time": start_time.strftime('%Y-%m-%d %H:%M:%S'),
                "end_time": "Ongoing/Not Found",
                "duration_minutes": 0,
                "duration_hours": 0,
                "energy_kwh": 0,
                "meter_start_wh": meter_start,
                "meter_stop_wh": meter_start,
                "avg_power_kw": 0,
                "max_power_kw": 0,
                "avg_voltage_v": 0,
                "avg_current_a": 0,
                "id_tag": id_tag,
                "reason": "Not Completed",
                "errors": "No Stop Transaction",
                "result": "Incomplete",
            }
            sessions.append(session)
    
    sessions_df = pd.DataFrame(sessions)
    
    # Calculate aggregate metrics
    if not sessions_df.empty:
        # Detect pre-charging failures (post-classification)
        precharging_df = sessions_df[sessions_df.apply(is_precharging_failure, axis=1)]
        precharging_count = len(precharging_df)
        
        # Detect idle time errors (errors outside sessions)
        raw_idle_errors = detect_idle_time_errors(df, sessions_df)
        
        # Collapse idle errors into episodes (same error repeatedly = 1 incident)
        raw_all_errors = raw_idle_errors.get("all_errors", [])
        collapsed_errors = collapse_idle_error_episodes(raw_all_errors, window_minutes=30)
        
        # Separate collapsed errors back into warnings/faults
        collapsed_warnings = [e for e in collapsed_errors if e.get("category") == "warning"]
        collapsed_faults = [e for e in collapsed_errors if e.get("category") == "fault"]
        
        idle_time_errors = {
            "warnings": collapsed_warnings,
            "faults": collapsed_faults,
            "all_errors": collapsed_errors,
            "total_count": len(collapsed_errors)
        }
        
        # Count successful sessions by error reason
        successful_sessions = sessions_df[sessions_df['result'] == "Successful"]
        successful_error_summary = {}
        
        for idx, row in successful_sessions.iterrows():
            error_text = row.get('errors', 'Unknown')
            if error_text and error_text != "None":
                # Split multiple errors if comma-separated
                error_list = [e.strip() for e in str(error_text).split(',')]
                for error in error_list:
                    if error and error != "None":
                        successful_error_summary[error] = successful_error_summary.get(error, 0) + 1
        
        # Count failed sessions by error reason
        failed_sessions = sessions_df[sessions_df['result'] == "Failed"]
        failed_error_summary = {}
        
        for idx, row in failed_sessions.iterrows():
            error_text = row.get('errors', 'Unknown')
            if error_text and error_text != "None":
                # Split multiple errors if comma-separated
                error_list = [e.strip() for e in str(error_text).split(',')]
                for error in error_list:
                    if error and error != "None":
                        failed_error_summary[error] = failed_error_summary.get(error, 0) + 1
        
        metrics = {
            "Total Sessions": len(sessions_df),
            "Successful Sessions": int((sessions_df['result'] == "Successful").sum()),
            "Successful Session Errors": successful_error_summary,
            "Failed Sessions": int((sessions_df['result'] == "Failed").sum()),
            "Failed Session Reasons": failed_error_summary,
            "Incomplete Sessions": int((sessions_df['result'] == "Incomplete").sum()),
            "Interrupted Sessions": int((sessions_df['result'] == "Interrupted").sum()),
            "Precharging Failures": precharging_count,
            "Idle Time Errors": idle_time_errors.get("all_errors", []),
            "Idle Time Error Count": idle_time_errors.get("total_count", 0),
            "Idle Time Warnings": idle_time_errors.get("warnings", []),
            "Idle Time Faults": idle_time_errors.get("faults", []),
            "Total Energy (kWh)": round(sessions_df['energy_kwh'].sum(), 2),
            "Average Energy per Session (kWh)": round(sessions_df['energy_kwh'].mean(), 2),
            "Total Duration (hours)": round(sessions_df['duration_hours'].sum(), 2),
            "Average Duration (minutes)": round(sessions_df['duration_minutes'].mean(), 1),
            "Average Power (kW)": round(sessions_df[sessions_df['avg_power_kw'] > 0]['avg_power_kw'].mean(), 2) if (sessions_df['avg_power_kw'] > 0).any() else 0,
            "Peak Power (kW)": round(sessions_df['max_power_kw'].max(), 2) if (sessions_df['max_power_kw'] > 0).any() else 0,
        }
    else:
        metrics = {
            "Total Sessions": 0,
            "Successful Sessions": 0,
            "Successful Session Errors": {},
            "Failed Sessions": 0,
            "Failed Session Reasons": {},
            "Incomplete Sessions": 0,
            "Interrupted Sessions": 0,
            "Precharging Failures": 0,
            "Idle Time Errors": [],
            "Idle Time Error Count": 0,
            "Idle Time Warnings": [],
            "Idle Time Faults": [],
            "Total Energy (kWh)": 0,
            "Total Duration (hours)": 0,
            "Average Power (kW)": 0,
        }
    
    return sessions_df, metrics


def extract_meter_stats(meter_df):
    """Extract voltage, current, and power statistics from MeterValues"""
    
    if meter_df.empty:
        return 0, 0, 0
    
    voltages = []
    currents = []
    powers = []
    
    for idx, row in meter_df.iterrows():
        payload = row['payload_json']
        meter_values = payload.get('meterValue', [])
        
        for mv in meter_values:
            sampled_values = mv.get('sampledValue', [])
            for sv in sampled_values:
                measurand = sv.get('measurand', '')
                value_str = sv.get('value', '0')
                try:
                    value = float(value_str)
                    if measurand == 'Voltage':
                        voltages.append(value)
                    elif measurand == 'Current.Import':
                        currents.append(value)
                    elif measurand == 'Power.Active.Import':
                        powers.append(value / 1000)  # Convert W to kW
                except:
                    pass
    
    avg_voltage = round(sum(voltages) / len(voltages), 1) if voltages else 0
    avg_current = round(sum(currents) / len(currents), 1) if currents else 0
    max_power = round(max(powers), 2) if powers else 0
    
    return avg_voltage, avg_current, max_power


def generate_summary(sessions_df):
    """Generate summary statistics for sessions (DEPRECATED - use metrics from build_sessions_enhanced)"""
    
    if sessions_df.empty:
        return {
            "Total Sessions": 0,
            "Successful Sessions": 0,
            "Successful Session Errors": {},
            "Failed Sessions": 0,
            "Failed Session Reasons": {},
            "Incomplete Sessions": 0,
        }
    
    # Count successful sessions by error reason
    successful_sessions = sessions_df[sessions_df['result'] == "Successful"]
    successful_error_summary = {}
    
    for idx, row in successful_sessions.iterrows():
        error_text = row.get('errors', 'Unknown')
        if error_text and error_text != "None":
            # Split multiple errors if comma-separated
            error_list = [e.strip() for e in str(error_text).split(',')]
            for error in error_list:
                if error and error != "None":
                    successful_error_summary[error] = successful_error_summary.get(error, 0) + 1
    
    # Count failed sessions by error reason
    failed_sessions = sessions_df[sessions_df['result'] == "Failed"]
    failed_error_summary = {}
    
    for idx, row in failed_sessions.iterrows():
        error_text = row.get('errors', 'Unknown')
        if error_text and error_text != "None":
            # Split multiple errors if comma-separated
            error_list = [e.strip() for e in str(error_text).split(',')]
            for error in error_list:
                if error and error != "None":
                    failed_error_summary[error] = failed_error_summary.get(error, 0) + 1
    
    return {
        "Total Sessions": len(sessions_df),
        "Successful Sessions": int((sessions_df['result'] == "Successful").sum()),
        "Successful Session Errors": successful_error_summary,
        "Failed Sessions": int((sessions_df['result'] == "Failed").sum()),
        "Failed Session Reasons": failed_error_summary,
        "Incomplete Sessions": int((sessions_df['result'] == "Incomplete").sum()),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
