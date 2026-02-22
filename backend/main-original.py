from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Form
import pandas as pd
import numpy as np
import json
import io
from datetime import timedelta
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
import os

#  =====================================================
#  MONGODB CONNECTION
#  =====================================================
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "zeon_db")
CP_COLLECTION_NAME = os.getenv("CP_COLLECTION_NAME", "cp_details")

# Initialize MongoDB client
try:
    print(f"� Connecting to MongoDB at: {MONGO_URI}")
    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    # Test connection
    mongo_client.admin.command('ping')
    print(f"✅ Successfully connected to MongoDB")
    
    # Get database and collection
    db = mongo_client[DB_NAME]
    cp_collection = db[CP_COLLECTION_NAME]
    
    # Create index on Charge Point id for faster queries
    cp_collection.create_index("Charge Point id")
    print(f"✅ MongoDB collection '{CP_COLLECTION_NAME}' ready")
    
    # Check if collection has data
    cp_count = cp_collection.count_documents({})
    print(f"📊 Current CP records in MongoDB: {cp_count}")
    
except (ConnectionFailure, ServerSelectionTimeoutError) as e:
    print(f"❌ Failed to connect to MongoDB: {e}")
    print(f"⚠️  Please ensure MongoDB is running at {MONGO_URI}")
    mongo_client = None
    db = None
    cp_collection = None
except Exception as e:
    print(f"❌ Unexpected error connecting to MongoDB: {e}")
    mongo_client = None
    db = None
    cp_collection = None

#  =====================================================
#  FASTAPI APP
#  =====================================================
app = FastAPI(title="ZEON Backend API", version="1.0.0")

app.add_middleware(
   CORSMiddleware,
   allow_origins=["http://localhost:3000", "http://localhost:5173"],
   allow_credentials=True,
   allow_methods=["*"],
   allow_headers=["*"],
)

@app.get("/")
async def root():
   return {"message": "Welcome to ZEON Backend API"}

@app.get("/health")
async def health_check():
   return {"status": "healthy"}


#  =====================================================
#  UPDATE CP REPORT ENDPOINT
#  =====================================================
@app.post("/update-cp-report")
async def update_cp_report(file: UploadFile = File(...)):
    """
    Update CP (Charge Point) details by uploading a new report file.
    Data is stored in MongoDB instead of in-memory DataFrame.
    
    Parameters:
    - file: Excel (.xlsx, .xls) or CSV (.csv) file containing updated CP details
    
    Returns:
    - Success message with count of records loaded
    - Updated CP details statistics
    
    Example:
    - Upload cp_report-20_12_2025_9_02_AM.xlsx to update all CP details
    """
    
    # Check MongoDB connection
    if cp_collection is None:
        raise HTTPException(
            status_code=503,
            detail="MongoDB is not connected. Please ensure MongoDB is running at mongodb://localhost:27017"
        )
    
    try:
        # Read uploaded file
        contents = await file.read()
        ext = file.filename.split('.')[-1].lower()
        
        print(f"📤 Received CP report upload: {file.filename}")
        print(f"📊 File size: {len(contents) / 1024:.2f} KB")
        
        # Parse file based on extension
        if ext == 'csv':
            new_cp_df = pd.read_csv(io.BytesIO(contents))
            print(f"✅ Parsed CSV file")
        elif ext in ['xlsx', 'xls']:
            new_cp_df = pd.read_excel(io.BytesIO(contents))
            print(f"✅ Parsed Excel file")
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file format: .{ext}. Please upload .xlsx, .xls, or .csv file"
            )
        
        # Validate that it looks like a CP report
        required_columns = ['Charge Point id']
        missing_columns = [col for col in required_columns if col not in new_cp_df.columns]
        
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid CP report format. Missing required columns: {missing_columns}. "
                       f"Available columns: {new_cp_df.columns.tolist()}"
            )
        
        # Get old record count from MongoDB
        old_record_count = cp_collection.count_documents({})
        
        # Clear existing CP details in MongoDB
        if old_record_count > 0:
            delete_result = cp_collection.delete_many({})
            print(f"🗑️  Deleted {delete_result.deleted_count} old CP records from MongoDB")
        
        # Convert DataFrame to list of dictionaries for MongoDB
        cp_records = new_cp_df.to_dict('records')
        
        # Insert new CP details into MongoDB
        if len(cp_records) > 0:
            insert_result = cp_collection.insert_many(cp_records)
            new_record_count = len(insert_result.inserted_ids)
            print(f"✅ Inserted {new_record_count} new CP records into MongoDB")
        else:
            new_record_count = 0
        
        # Get unique CP IDs
        unique_cp_ids = len(cp_collection.distinct("Charge Point id"))
        
        # Get sample CP IDs
        sample_records = list(cp_collection.find({}, {"Charge Point id": 1, "_id": 0}).limit(5))
        sample_cp_ids = [rec.get("Charge Point id") for rec in sample_records if rec.get("Charge Point id")]
        
        print(f"✅ CP details updated successfully in MongoDB!")
        print(f"   Records: {old_record_count} → {new_record_count}")
        print(f"   Unique CP IDs: {unique_cp_ids}")
        
        # Return success response
        return JSONResponse(content={
            "status": "success",
            "message": "CP details updated successfully in MongoDB",
            "filename": file.filename,
            "storage": "MongoDB",
            "statistics": {
                "total_records": new_record_count,
                "unique_cp_ids": unique_cp_ids,
                "total_columns": len(new_cp_df.columns),
                "previous_record_count": old_record_count,
                "records_added": new_record_count - old_record_count
            },
            "columns": new_cp_df.columns.tolist(),
            "sample_cp_ids": sample_cp_ids
        })
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"❌ Error updating CP details: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error updating CP report: {str(e)}"
        )


#  =====================================================
#  GET CP DETAILS ENDPOINT (NEW - for viewing current data)
#  =====================================================
@app.get("/cp-details")
async def get_cp_details_info():
    """
    Get information about currently loaded CP details from MongoDB.
    
    Returns:
    - Statistics about loaded CP data
    - Sample records
    """
    
    # Check MongoDB connection
    if cp_collection is None:
        return JSONResponse(content={
            "status": "error",
            "message": "MongoDB is not connected. Please ensure MongoDB is running at mongodb://localhost:27017",
            "statistics": {
                "total_records": 0,
                "unique_cp_ids": 0,
                "total_columns": 0
            }
        })
    
    try:
        # Get total record count from MongoDB
        total_records = cp_collection.count_documents({})
        
        if total_records == 0:
            return JSONResponse(content={
                "status": "no_data",
                "message": "No CP details in MongoDB. Please upload a CP report using /update-cp-report endpoint.",
                "storage": "MongoDB",
                "statistics": {
                    "total_records": 0,
                    "unique_cp_ids": 0,
                    "total_columns": 0
                }
            })
        
        # Get unique CP IDs
        unique_cp_ids = len(cp_collection.distinct("Charge Point id"))
        
        # Get sample records (first 5)
        sample_cursor = cp_collection.find({}, {"_id": 0}).limit(5)
        sample_records = list(sample_cursor)
        
        # Get all column names from first document
        if sample_records:
            columns = list(sample_records[0].keys())
        else:
            columns = []
        
        # Filter sample records to show only key columns if they exist
        key_columns = ['Charge Point id', 'Station Alias Name', 'OEM Name', 'Power (kW)', 'Firmware Version']
        available_key_columns = [col for col in key_columns if col in columns]
        
        if available_key_columns:
            filtered_samples = []
            for record in sample_records:
                filtered_record = {col: record.get(col) for col in available_key_columns}
                filtered_samples.append(filtered_record)
            sample_records = filtered_samples
        
        return JSONResponse(content={
            "status": "success",
            "message": "CP details loaded from MongoDB",
            "storage": "MongoDB",
            "statistics": {
                "total_records": total_records,
                "unique_cp_ids": unique_cp_ids,
                "total_columns": len(columns)
            },
            "columns": columns,
            "sample_records": sample_records
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving CP details info from MongoDB: {str(e)}"
        )


#  =====================================================
#  FILE UPLOAD ENDPOINT WITH DATA SOURCE PARAMETER
#  =====================================================
@app.post("/process-file")
async def process_file(file: UploadFile = File(...), data_source: str = Form("cms")):
   """
   Process uploaded OCPP log file
   
   Parameters:
   - file: The CSV/Excel file to process
   - data_source: Source of the data - "cms" (default) or "s3"
                  If "s3", the row order will be reversed before processing
   """
   try:
       contents = await file.read()
       ext = file.filename.split('.')[-1].lower()

       if ext == 'csv':
           df = pd.read_csv(io.BytesIO(contents))
       elif ext in ['xlsx', 'xls']:
           df = pd.read_excel(io.BytesIO(contents))
       else:
           raise HTTPException(status_code=400, detail="Unsupported file format")

       # DEBUG: Print available columns and data source
       print(f"📊 Available columns: {df.columns.tolist()}")
       print(f"📊 DataFrame shape: {df.shape}")
       print(f"📊 Data source: {data_source}")
       
       # ⚠️ Handle S3 data: reverse row order (flip upside down)
       if data_source.lower() == "s3":
           # Save before reversal for debugging
           df.to_csv("./df_before_reversal.csv", index=False)
           print("🔄 Reversing row order for S3 data source")
           print(f"   First row before reversal: ID={df.iloc[0].get('Id', 'N/A')}, Time={df.iloc[0].get('real_time', 'N/A')}")
           
           df = df.iloc[::-1].reset_index(drop=True)
           
           print(f"✅ Row order reversed. New shape: {df.shape}")
           print(f"   First row after reversal: ID={df.iloc[0].get('Id', 'N/A')}, Time={df.iloc[0].get('real_time', 'N/A')}")
           # Save after reversal for debugging
           df.to_csv("./df_after_reversal.csv", index=False)
       
       result = final_process(df)

       # parse JSON strings → objects
       result["Connector1"] = json.loads(result["Connector1"])
       result["Connector2"] = json.loads(result["Connector2"])
       result["info"] = json.loads(result["info"]) if isinstance(result["info"], str) else result["info"]

       # sanitize numpy / NaN / Inf
       result = json_safe(result)

       return JSONResponse(content=result)

   except ValueError as e:
       raise HTTPException(status_code=400, detail=str(e))
   except Exception as e:
       raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


#  =====================================================
#  🔥 JSON SAFE SERIALIZER
#  =====================================================
def json_safe(obj):
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


def build_summary(df, idle_errors=None):
   # FIX: Check if DataFrame is empty first
   if df.empty:
       return {
           "Preparing Sessions": 0,
           "Charging Sessions": 0,
           "Successful Sessions": 0,
           "Failed / Error Stops": 0,
           "Incomplete Sessions": 0,
           "Successful Error Summary": {},
           "Failed / Error Error Summary": {},
           "Idle Time Errors": idle_errors if idle_errors else [],
           "Remote Start": 0,
           "Auto Start": 0,
           "RFID Start": 0,
           "Peak Power Delivered (kW)": 0,
           "Avg Power per Session (kW)": 0,
           "Total Energy Delivered (kWh)": 0,
           "Avg Session Duration (mins)": 0,
       }
   
   # FIX: Check if columns exist before accessing them
   # Clean Power column (handle None / NaN / strings)
   if 'Power.Active.Import' in df.columns:
       power_kw = (
           pd.to_numeric(df['Power.Active.Import'], errors='coerce')
           .dropna()
           / 1000
       )
   else:
       power_kw = pd.Series(dtype=float)

   # Calculate total energy delivered
   total_energy = 0
   if 'session_energy_delivered_kwh' in df.columns:
       total_energy = pd.to_numeric(df['session_energy_delivered_kwh'], errors='coerce').sum()

   # Calculate average session duration
   avg_duration = 0
   if 'session_duration_minutes' in df.columns:
       valid_durations = pd.to_numeric(df['session_duration_minutes'], errors='coerce').dropna()
       if len(valid_durations) > 0:
           avg_duration = round(valid_durations.mean(), 2)

   # Boolean masks for error summaries - check if columns exist
   if 'stop' in df.columns and 'all_errors' in df.columns:
       # NEW: Handle multiple errors per session (stored as lists of dicts with timestamps)
       successful_error_summary = {}
       failed_error_summary = {}
       
       success_mask = (df["stop"] == "Successful")
       failed_mask = (df["stop"] == "Failed / Error")
       
       # Count all errors for successful sessions
       for errors in df.loc[success_mask, 'all_errors'].dropna():
           if isinstance(errors, list):
               for error_dict in errors:
                   if isinstance(error_dict, dict):
                       # Extract all non-None error values from the dict (excluding timestamp)
                       for key, val in error_dict.items():
                           if key != 'timestamp' and val and val not in ["None", "NoError"]:
                               successful_error_summary[val] = successful_error_summary.get(val, 0) + 1
       
       # Count all errors for failed sessions
       for errors in df.loc[failed_mask, 'all_errors'].dropna():
           if isinstance(errors, list):
               for error_dict in errors:
                   if isinstance(error_dict, dict):
                       # Extract all non-None error values from the dict (excluding timestamp)
                       for key, val in error_dict.items():
                           if key != 'timestamp' and val and val not in ["None", "NoError"]:
                               failed_error_summary[val] = failed_error_summary.get(val, 0) + 1
       
       successful_sessions = int((df['stop'] == "Successful").sum())
       failed_sessions = int((df['stop'] == "Failed / Error").sum())
       incomplete_sessions = int((df['stop'] == "Incomplete").sum())
   else:
       successful_error_summary = {}
       failed_error_summary = {}
       successful_sessions = 0
       failed_sessions = 0
       incomplete_sessions = 0

   summary = {
       "Preparing Sessions": int(df['is_Preparing'].sum()) if 'is_Preparing' in df.columns else 0,
       "Charging Sessions": int(df['is_Charging'].sum()) if 'is_Charging' in df.columns else 0,
       "Successful Sessions": successful_sessions,
       "Failed / Error Stops": failed_sessions,
       "Incomplete Sessions": incomplete_sessions,
       "Successful Error Summary": successful_error_summary,
       "Failed / Error Error Summary": failed_error_summary,
       "Idle Time Errors": idle_errors if idle_errors else [],
       "Remote Start": int(df['is_REMOTE_Start'].sum()) if 'is_REMOTE_Start' in df.columns else 0,
       "Auto Start": int(df['is_Auto_Start'].sum()) if 'is_Auto_Start' in df.columns else 0,
       "RFID Start": int(df['is_RFID_Start'].sum()) if 'is_RFID_Start' in df.columns else 0,
       "Peak Power Delivered (kW)": round(power_kw.max(), 2) if not power_kw.empty else 0,
       "Avg Power per Session (kW)": round(power_kw.mean(), 2) if not power_kw.empty else 0,
       "Total Energy Delivered (kWh)": round(total_energy, 2),
       "Avg Session Duration (mins)": avg_duration,
   }

   return summary

def cp_details(cp_id):
    """
    Retrieve CP details from MongoDB.
    Returns a DataFrame for compatibility with existing code.
    """
    print(f"🔍 Looking up CP details for: {cp_id} in MongoDB")
    
    try:
        # Check if MongoDB is connected
        if cp_collection is None:
            print("⚠️ MongoDB not connected")
            return pd.DataFrame()
        
        # Query MongoDB for the CP ID
        result_doc = cp_collection.find_one({"Charge Point id": cp_id}, {"_id": 0})
        
        if result_doc is None:
            print(f"⚠️ No CP details found for CP ID: {cp_id}")
            return pd.DataFrame()
        
        # Convert to DataFrame
        result_df = pd.DataFrame([result_doc])
        
        # Select relevant columns (check if they exist first)
        desired_columns = ['Station Alias Name', 'Charge Point id', 'OEM Name', 'Power (kW)', 'Firmware Version', 'Connector Standard(AC/DC)']
        available_columns = [col for col in desired_columns if col in result_df.columns]
        
        if available_columns:
            result_df = result_df[available_columns]
        
        print(f"✅ Found CP details in MongoDB")
        return result_df
        
    except Exception as e:
        print(f"❌ Error retrieving CP details from MongoDB: {e}")
        return pd.DataFrame()

def date_details(date):
   return {"start_date":min(date), "end_date":max(date)}



def parse_ocpp_datetime(col):
   s = (
       col.astype(str)
          .str.replace(' IST', '', regex=False)
          .str.replace(',', '', regex=False)
          .str.strip()
   )

   dt = pd.to_datetime(
       s,
       format="mixed",
       dayfirst=True,
       errors="coerce"
   )
   return dt

def final_process(df):
   # FIX 1: Make a copy to avoid SettingWithCopyWarning
   df = df.copy()
   
   dt_real = parse_ocpp_datetime(df['real_time'])
   dt_recv = parse_ocpp_datetime(df['received_time'])

   # ---- Extract fields ----
   df['date'] = dt_real.dt.strftime('%d/%m/%Y')
   df['real_time'] = dt_real.dt.strftime('%H:%M:%S')
   df['received_time'] = dt_recv.dt.strftime('%H:%M:%S')
   
   # NEW: Keep full datetime for session timing
   df['real_datetime'] = dt_real

   cols = df.columns.tolist()
   cols.remove('date')
   cols.insert(1, 'date')
   df = df[cols]

   # =====================================================
   # OPTIMIZED STRING PARSING (Vectorized - 10x faster!)
   # =====================================================
   # Convert payLoadData to string once for all operations
   payload_str = df["payLoadData"].astype(str)
   
   # Extract status using vectorized regex (replaces status_split)
   df["status"] = payload_str.str.extract(r'"status"\s*:\s*"([^"]+)"', expand=False)
   
   # Extract connectorId using vectorized regex (replaces connectorid_split)
   connector_match = payload_str.str.extract(r'"connectorId"\s*:\s*(\d+)', expand=False)
   df["connectorId"] = connector_match
   
   # Extract transactionId using vectorized regex (replaces transactionId_split)
   # Try both formats: with and without backslash
   tid_match1 = payload_str.str.extract(r'"transactionId\\*"\s*:\s*(\d+)', expand=False)
   tid_match2 = payload_str.str.extract(r'"transactionId"\s*:\s*(\d+)', expand=False)
   df["transactionId"] = tid_match1.fillna(tid_match2)
   
   # Extract idTag using vectorized regex (replaces idTag_split)
   # Only extract if not idTagInfo
   idtag_match = payload_str.str.extract(r'"idTag"\s*:\s*"([^"]+)"', expand=False)
   # Filter out idTagInfo matches
   has_idtaginfo = payload_str.str.contains('idTagInfo', na=False)
   df["idTag"] = idtag_match.where(~has_idtaginfo, None)
   
   # Extract meterStart using vectorized regex (replaces start_split)
   df["meterStart"] = payload_str.str.extract(r'"meterStart"\s*:\s*(\d+)', expand=False)
   
   # Extract meterStop using vectorized regex (replaces stop_split)
   df["meterStop"] = payload_str.str.extract(r'"meterStop"\s*:\s*(\d+)', expand=False)
   
   # Extract errorCode using vectorized regex (replaces errorCode_split)
   df["errorCode"] = payload_str.str.extract(r'"errorCode"\s*:\s*"([^"]+)"', expand=False)
   
   # Extract info using vectorized regex (replaces info_split)
   df["info"] = payload_str.str.extract(r'"info"\s*:\s*"([^"]+)"', expand=False)
   
   # Extract vendorErrorCode using vectorized regex (replaces vendorErrorCode_split)
   df["vendorErrorCode"] = payload_str.str.extract(r'"vendorErrorCode"\s*:\s*"([^"]+)"', expand=False)
   
   # Extract reason using vectorized regex (replaces reason_split)
   df["reason"] = payload_str.str.extract(r'"reason"\s*:\s*"([^"]+)"', expand=False)
   
   # Extract StopReason using vectorized regex (replaces stopReason_split)
   # Try direct StopReason key first
   stop_reason1 = payload_str.str.extract(r'"StopReason"\s*:\s*"?([^",}]+)"?', expand=False)
   # Try StopReason: format in vendorErrorCode
   stop_reason2 = payload_str.str.extract(r'StopReason:([^",}]+)', expand=False)
   df["StopReason"] = stop_reason1.fillna(stop_reason2).astype(object).str.strip()
   
   # ============================
   # Fill missing connectorId using transactionId mapping
   # ============================
   # Get unique transactionIds (excluding None/NaN)
   unique_transactions = df["transactionId"].dropna().unique()
   
   filled_count = 0
   for tid in unique_transactions:
       # Find rows with this transactionId that have a non-null connectorId
       rows_with_connector = df.loc[
           (df["transactionId"] == tid) & (df["connectorId"].notna())
       ]
       
       # If we found at least one row with connectorId, use it to fill missing ones
       if not rows_with_connector.empty:
           connector_value = rows_with_connector["connectorId"].iloc[0]
           
           # Find rows with this transactionId but missing connectorId
           mask = (df["transactionId"] == tid) & (df["connectorId"].isna())
           
           # Fill the missing connectorId values
           if mask.any():
               df.loc[mask, "connectorId"] = connector_value
               filled_count += mask.sum()
   
   print(f"✅ Filled {filled_count} missing connectorId values using transactionId mapping")




   # ============================
   # Allowed OCPP attributes map
   # ============================
   ALLOWED_ATTRIBUTES = {
       ("Current.Import", "EV"): "Current.Import_EV",
       ("Current.Import", "Outlet"): "Current.Import_Outlet",
       ("Energy.Active.Import.Register", None): "Energy.Active.Import.Register",
       ("Power.Active.Import", None): "Power.Active.Import",
       ("SoC", "EV"): "SoC_EV",
       ("Voltage", "EV"): "Voltage_EV",
       ("Voltage", "Inlet"): "Voltage_Inlet",
       ("Voltage", "Outlet"): "Voltage_Outlet",
       ("Temperature", "Cable"): "Temperature_Cable",
   }

   # =========================================
   # Extract selected MeterValues from JSON
   # =========================================
   def extract_selected_ocpp_metrics(json_text):
       result = {}

       # Skip non-strings
       if not isinstance(json_text, str):
           return result

       # First-level JSON parse
       try:
           payload = json.loads(json_text)
       except Exception:
           return result

       # Handle nested JSON payloads (very common in OCPP logs)
       if isinstance(payload, dict) and "payload" in payload and isinstance(payload["payload"], str):
           try:
               payload = json.loads(payload["payload"])
           except Exception:
               return result

       # Must be dict at this point
       if not isinstance(payload, dict):
           return result

       meter_values = payload.get("meterValue", [])
       if not isinstance(meter_values, list):
           return result

       # Parse MeterValues
       for mv in meter_values:
           sampled_values = mv.get("sampledValue", [])
           if not isinstance(sampled_values, list):
               continue

           for sv in sampled_values:
               measurand = sv.get("measurand")
               location = sv.get("location")
               value = sv.get("value")
               unit = sv.get("unit")

               if value is None:
                   continue

               # Convert value to numeric for processing
               try:
                   numeric_value = float(value)
               except (ValueError, TypeError):
                   numeric_value = value

               # Exact (measurand + location) match
               key = (measurand, location)
               if key in ALLOWED_ATTRIBUTES:
                   attr_name = ALLOWED_ATTRIBUTES[key]
                   # Handle unit conversion for Power.Active.Import
                   if attr_name == "Power.Active.Import" and isinstance(numeric_value, (int, float)):
                       if unit == "kWh":
                           result[attr_name] = numeric_value * 1000
                       elif unit == "Wh":
                           result[attr_name] = numeric_value
                       else:
                           result[attr_name] = value
                   else:
                       result[attr_name] = value
                   continue

               # Measurand-only match (location independent)
               key_no_location = (measurand, None)
               if key_no_location in ALLOWED_ATTRIBUTES:
                   attr_name = ALLOWED_ATTRIBUTES[key_no_location]
                   # Handle unit conversion for Power.Active.Import
                   if attr_name == "Power.Active.Import" and isinstance(numeric_value, (int, float)):
                       if unit == "kWh":
                           result[attr_name] = numeric_value * 1000
                       elif unit == "Wh":
                           result[attr_name] = numeric_value
                       else:
                           result[attr_name] = value
                   else:
                       result[attr_name] = value

       return result

   # =========================================
   # Auto-detect JSON column in DataFrame
   # =========================================
   def find_json_column(df):
       # DEBUG: Print all columns
       print(f"🔍 Searching for JSON column in: {df.columns.tolist()}")
       
       # First pass: Look for columns with meterValue (preferred)
       for col in df.columns:
           print(f"🔍 Checking column: {col}")
           
           # Check first 100 non-null values (increased from 20)
           sample_values = df[col].dropna().head(100)
           
           found_meter_value = False
           for idx, val in enumerate(sample_values):
               if isinstance(val, str):
                   try:
                       parsed = json.loads(val)
                       
                       # Check for meterValue directly
                       if isinstance(parsed, dict) and "meterValue" in parsed:
                           print(f"  ✅ Row {idx}: Found 'meterValue' directly in column '{col}'")
                           found_meter_value = True
                           break
                       
                       # Check for nested payload with meterValue
                       if isinstance(parsed, dict) and "payload" in parsed:
                           payload_val = parsed.get("payload")
                           if isinstance(payload_val, str):
                               try:
                                   nested = json.loads(payload_val)
                                   if isinstance(nested, dict) and "meterValue" in nested:
                                       print(f"  ✅ Row {idx}: Found nested 'meterValue' in column '{col}'")
                                       found_meter_value = True
                                       break
                               except:
                                   pass
                   except Exception as e:
                       # Not JSON, continue
                       pass
           
           if found_meter_value:
               print(f"✅ JSON column with meterValue detected: {col}")
               return col
       
       # Second pass: If no meterValue found, look for any column named 'payLoadData' that contains JSON
       # This handles cases where meterValue entries appear later in the file
       if 'payLoadData' in df.columns:
           col = 'payLoadData'
           sample_values = df[col].dropna().head(20)
           
           for idx, val in enumerate(sample_values):
               if isinstance(val, str):
                   try:
                       parsed = json.loads(val)
                       if isinstance(parsed, dict):
                           print(f"⚠️ No meterValue found in first 100 rows, but 'payLoadData' contains JSON. Using it anyway.")
                           print(f"   Note: MeterValues extraction may yield empty results if file has no MeterValues data.")
                           return col
                   except:
                       pass
       
       # If no column found, print debug info
       print(f"❌ No JSON column with meterValue found")
       print(f"📋 Available columns: {df.columns.tolist()}")
       
       # Sample the first row of each column to help diagnose
       print(f"\n📊 First row sample from each column:")
       for col in df.columns:
           sample = df[col].iloc[0] if len(df) > 0 else None
           if isinstance(sample, str) and len(sample) > 100:
               print(f"  {col}: {sample[:100]}...")
           else:
               print(f"  {col}: {sample}")
       
       return None

   # ============================
   # MAIN EXECUTION
   # ============================


   # 🔹 Find JSON column automatically
   json_column = find_json_column(df)
   if json_column is None:
       raise ValueError("❌ No OCPP MeterValues JSON column found")

   print(f"✅ JSON column detected: {json_column}")

   extracted = df[json_column].apply(extract_selected_ocpp_metrics)
   extracted_df = pd.DataFrame(extracted.tolist())
   
   # FIX: Print what columns were extracted to help debug
   print(f"📊 Extracted MeterValues columns: {extracted_df.columns.tolist()}")
   
   df = pd.concat([df, extracted_df], axis=1)



   tl = [v for v in df['transactionId'].unique() if v is not None]
   dt = {}

   for i in tl:
       x = df.loc[df['transactionId'] == i, 'connectorId'].unique()
       y = x[pd.notna(x)]
       if len(y) > 0:
           dt[i] = y[0]

   def transferConnectId(row):
       if row['connectorId'] is not None:
           return row['connectorId']
       if row['transactionId'] in dt:
           return str(dt[row['transactionId']])

   df['connectorId'] = df.apply(transferConnectId, axis=1)

   l = list(df[(df['command']=="AuthorizeResponse") & (df['status']=="Invalid")]['Id'])
   df = df[~df['Id'].isin(l)]

   l = list(df[(df['command']=="StartTransactionResponse") & (df['status']=="Accepted")]['Id'])
   df["status"] = df.apply(lambda r: 'Accepted' if r['Id'] in l else r['status'], axis=1)

   l = list(df[(df['command']=="RemoteStartTransactionResponse") & (df['status']=="Accepted")]['Id'])
   df["status"] = df.apply(lambda r: 'Accepted' if r['Id'] in l else r['status'], axis=1)

   df["status"] = df.apply(
       lambda r: 'meterStart' if r['command']=="StartTransactionRequest" and r['status']=="Accepted" else r['status'],
       axis=1
   )

   l = list(df[(df['command']=="AuthorizeResponse") & (df['status']=="Accepted")]['Id'])
   df["status"] = df.apply(lambda r: 'Accepted' if r['Id'] in l else r['status'], axis=1)

   df['S.No'] = df.index + 1
   df = df.sort_values(by='S.No', ascending=False)
   df.drop(columns=['S.No'], inplace=True)

   # FIX: Update idtag_update function to use .loc instead of .iloc with get_loc
   def idtag_update(index, connector):
       # Use .loc with row index and column name instead of positional indexing
       df.loc[df.index[index], 'connectorId'] = connector

   for i in range(len(df)):
       x = df.iloc[i]
       if x['command']=="StatusNotificationRequest" and x['status']=="Preparing":
           d={}
           c=x['connectorId']
           while True:
               i+=1
               # Check bounds before accessing
               if i >= len(df):
                   break
               if df.iloc[i]['command']=="AuthorizeRequest" and df.iloc[i]['status']=="Accepted":
                   d[df.iloc[i]['idTag']] = i
               if df.iloc[i]['command']=="StartTransactionRequest" and df.iloc[i]['status']=="meterStart" and df.iloc[i]['connectorId']==c:
                   if df.iloc[i]['idTag'] in d:
                       idtag_update(d[df.iloc[i]['idTag']], c)
                       break
               if df.iloc[i]['status'] in ["Available","Finishing"] and df.iloc[i]['connectorId']==c:
                   break

   # OPTIMIZED: Replace loop with vectorized operation
   # Build transaction ID mapping using boolean indexing
   mask = (df['command'] == "StartTransactionResponse") & (df['status'] == "meterStart")
   tid_mapping = df.loc[mask, ['Id', 'transactionId']].set_index('Id')['transactionId'].to_dict()
   
   # Apply mapping using vectorized map operation (faster than apply)
   df["transactionId"] = df["Id"].map(tid_mapping).fillna(df["transactionId"])

   # OPTIMIZED: Replace loop with boolean indexing
   mask = (df['command'] == "RemoteStopTransactionResponse") & (df['status'] == "Accepted")
   accepted_ids = set(df.loc[mask, 'Id'].tolist())
   
   # Vectorized update using loc
   df.loc[df['Id'].isin(accepted_ids), 'status'] = 'Accepted'

   df = df[~df['command'].isin([
       "RemoteStartTransactionResponse",
       "AuthorizeResponse",
       "RemoteStopTransactionResponse",
       "HeartbeatRequest",
       "HeartbeatResponse"
   ])]

   # OPTIMIZED: Replace apply with vectorized operations using np.select
   # This is 5-10x faster than apply
   df.to_csv('df_before_status_update.csv', index=False)
   
   # Create conditions and choices for np.select
   conditions = [
       (df['command'] == "StartTransactionRequest") & (df['idTag'].astype(str).str.contains('VID', na=False)),
       (df['command'] == "StartTransactionRequest") & (df['idTag'].astype(str).str.len() == 8),
       (df['command'] == "StartTransactionRequest"),
       (df['command'] == "RemoteStopTransactionRequest") & (df['status'] == "Accepted"),
       (df['status'] == "Charging") & (df['info'] == "100%SOC"),
       df['payLoadData'].astype(str).str.contains('meterStop', na=False)
   ]
   
   choices = [
       'Auto-Start',
       'RFID-Start',
       'REMOTE-Start',
       'REMOTE-Stop',
       'FullCharge-Stop',
       'meterStop'
   ]
   
   df["status"] = np.select(conditions, choices, default=df["status"])
   df.to_csv('df_after_status_update.csv', index=False)
   
   # OPTIMIZED: Replace loop with vectorized operation
   mask = df['command'] == "StartTransactionRequest"
   connector_mapping = df.loc[mask, ['Id', 'connectorId']].set_index('Id')['connectorId'].to_dict()
   
   # Vectorized update for StartTransactionResponse
   mask = df['command'] == 'StartTransactionResponse'
   df.loc[mask, 'connectorId'] = df.loc[mask, 'Id'].map(connector_mapping).fillna(df.loc[mask, 'connectorId'])
   df1 = df[df['connectorId'].isin(['1','0'])]
   df2 = df[df['connectorId'].isin(['2','0'])]

   # =====================================================
   # 🚀 IDLE TIME ERROR DETECTION
   # =====================================================
   def detect_idle_errors(sf, sessions_df):
       """
       Detect errors that occur outside of charging sessions (idle time).
       Vectorized implementation for O(N) performance.
       
       Parameters:
       - sf: Full DataFrame with all OCPP messages
       - sessions_df: DataFrame with session boundaries (Session_Start, Session_Stop, Error_Window_End)
       
       Returns:
       - List of idle time errors with timestamps
       """
       
       if sf.empty or sessions_df.empty:
           return []
       
       # Reset index for consistent indexing
       sf_reset = sf.reset_index(drop=True)
       
       # Initialize mask: True = Inside a session, False = Idle
       # We start with False (Idle) and mark session ranges as True
       is_in_session = np.zeros(len(sf_reset), dtype=bool)
       
       # Mark all session ranges
       for _, session in sessions_df.iterrows():
           start = int(session['Session_Start'])
           # Use error_window_end to exclude errors within 2-min window after session
           end = int(session['Error_Window_End']) if pd.notna(session.get('Error_Window_End')) else int(session['Session_Stop'])
           
           # Bound checks
           start = max(0, start)
           end = min(len(sf_reset) - 1, end)
           
           if start <= end:
               is_in_session[start : end + 1] = True
       
       # Filter for rows that are NOT in a session (Idle)
       idle_df = sf_reset[~is_in_session].copy()
       
       if idle_df.empty:
           return []

       # List of columns to check for errors
       error_cols = ['errorCode', 'info', 'vendorErrorCode', 'reason', 'StopReason']
       valid_cols = [col for col in error_cols if col in idle_df.columns]
       
       if not valid_cols:
           return []
           
       # Create a mask for rows that have at least one non-empty error value
       # We check if value is NOT in the ignore list
       ignore_values = ["", "None", "nan", "NoError", None]
       
       has_error_mask = pd.Series(False, index=idle_df.index)
       
       for col in valid_cols:
           # Convert to string, strip, and check if not in ignore list
           # We use a vectorized apply approach or direct comparison
           col_series = idle_df[col].astype(str).str.strip()
           mask = ~col_series.isin(ignore_values) & (col_series != 'nan')
           has_error_mask |= mask
           
       # Filter idle_df to stick to rows with actual errors
       error_rows = idle_df[has_error_mask]
       
       idle_errors = []
       
       for idx, row in error_rows.iterrows():
           error_details = {}
           has_error = False
           
           for col in valid_cols:
               val = row[col]
               if pd.notna(val) and str(val).strip() not in ignore_values and str(val) != 'nan':
                   error_details[col] = str(val)
                   has_error = True
           
           if has_error:
               timestamp = row.get('real_datetime')
               idle_error = {
                   'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S') if pd.notna(timestamp) else None,
                   'command': str(row.get('command')) if pd.notna(row.get('command')) else None,
                   'status': str(row.get('status')) if pd.notna(row.get('status')) else None,
               }
               idle_error.update(error_details)
               idle_errors.append(idle_error)

       print(f"📊 Total idle time errors found: {len(idle_errors)}")
       return idle_errors

   # =====================================================
   # 🚀 NEW IMPROVED SESSION CLOSING LOGIC
   # =====================================================
   def report_df(sf):
       """
       Enhanced session detection with accurate stop detection:
       - Uses meterStop as primary stop signal
       - Falls back to Available/Faulted/Finishing status
       - Captures errors within 2-minute window after stop
       - Handles incomplete sessions properly
       - Determines actual start mode from StartTransactionRequest idTag
       - FIX: Preserves transactionId from session data - searches BOTH forward and backward
       - NEW: Stores errors with timestamps
       """
       
       # Check if DataFrame is empty
       if sf.empty or len(sf) == 0:
           return pd.DataFrame()

       # -----------------------------
       # 1. Find session start points (Preparing)
       # -----------------------------
       sf_reset = sf.reset_index(drop=True)
       starts = sf_reset.index[sf_reset["status"] == "Preparing"].tolist()

       # If no "Preparing" status found, return empty DataFrame
       if len(starts) == 0:
           return pd.DataFrame()

       # print(f"🔍 Found {len(starts)} session starts (Preparing)")

       # =====================================================================
       # SESSION CLOSING LOGIC - PRIORITY-BASED STOP DETECTION
       # =====================================================================
       # 
       # Priority 1: meterStop with matching transactionId (HIGHEST PRIORITY)
       #   - Searches ENTIRE session range (from session start to next session/EOF)
       #   - Requires BOTH: status='meterStop' AND transactionId match
       #   - Takes precedence over ANY status transitions (Finishing, Available, Faulted)
       #   - Example: Preparing → Charging → Finishing → meterStop
       #            Result: Stops at meterStop (not Finishing) ✅
       #
       # Priority 2: Status Transition (MEDIUM PRIORITY)
       #   - Only triggered if Priority 1 finds nothing
       #   - Looks for first occurrence of: Available, Faulted, or Finishing
       #   - Uses first match found in session range
       #
       # Priority 3: Incomplete (LOW PRIORITY)
       #   - Only triggered if both Priority 1 and 2 find nothing
       #   - Checks last known status in search range
       #   - If status is still "Charging" → marks as "Incomplete"
       #   - Otherwise → marks as "No_Clear_Stop"
       #
       # Error Window Extension (Applied AFTER stop detection):
       #   - After identifying primary stop, opens 2-minute error window
       #   - Captures errors (errorCode, vendorErrorCode) within 2 minutes
       #   - Associates these errors with the closed session
       # =====================================================================
       
       sessions = []
       
       for i, start_idx in enumerate(starts):
           session_info = {
               "Session_Start": start_idx,
               "Session_Stop": None,
               "Stop_Type": None,  # meterStop, Available, Faulted, Finishing, Incomplete
               "Error_Window_End": None,
               "Session_TransactionId": None  # Store session's transactionId for matching
           }
           
           # Determine search boundary (next Preparing or end of file)
           if i + 1 < len(starts):
               search_end = starts[i + 1]
           else:
               search_end = len(sf_reset)
           
           # Search for PRIMARY STOP SIGNALS
           search_df = sf_reset.iloc[start_idx:search_end]
           
           # Extract session's transactionId first (for Priority 1 matching)
           session_transaction_id = None
           if 'transactionId' in search_df.columns:
               # Look for transactionId in StartTransactionRequest or StartTransactionResponse
               start_tx_rows = search_df[
                   search_df['command'].isin(['StartTransactionRequest', 'StartTransactionResponse']) &
                   search_df['transactionId'].notna()
               ]
               if not start_tx_rows.empty:
                   session_transaction_id = str(start_tx_rows['transactionId'].iloc[0])
                   session_info["Session_TransactionId"] = session_transaction_id
                   # print(f"  🔍 Session {i+1}: TransactionId = {session_transaction_id}")
               else:
                   # Fallback: any transactionId in the session range
                   tids = search_df['transactionId'].dropna()
                   if not tids.empty:
                       session_transaction_id = str(tids.iloc[0])
                       session_info["Session_TransactionId"] = session_transaction_id
                       # print(f"  🔍 Session {i+1}: TransactionId = {session_transaction_id} (fallback)")
           
           # ============================================================
           # Priority 1: Look for meterStop with matching transactionId
           # IMPORTANT: This searches the ENTIRE session range and takes
           # precedence over ANY status transitions (Finishing, Available, etc.)
           # even if those status transitions appear earlier in the timeline.
           # ============================================================
           primary_stop_idx = None
           if session_transaction_id and 'transactionId' in search_df.columns:
               # STRICT CHECK: Both status='meterStop' AND transactionId match required
               # This will find meterStop even if it appears AFTER Finishing/Available/Faulted
               meter_stop_matches = search_df[
                   (search_df['status'] == 'meterStop') &
                   (search_df['transactionId'].astype(str) == session_transaction_id)
               ]
               
               if not meter_stop_matches.empty:
                   primary_stop_idx = meter_stop_matches.index[0]
                   session_info["Stop_Type"] = "meterStop"
                   # print(f"  ✅ Session {i+1}: PRIORITY 1 - Found meterStop with matching transactionId at index {primary_stop_idx}")
                   # print(f"     (This takes precedence over any Finishing/Available/Faulted status)")
               else:
                   # No match found - will proceed to Priority 2
                   pass
                   # print(f"  ⚠️ Session {i+1}: PRIORITY 1 - No meterStop with matching transactionId found")
                   # print(f"     Proceeding to Priority 2 (status transitions)...")
           else:
               # No transactionId available - skip Priority 1, go to Priority 2
               pass
               # print(f"  ⚠️ Session {i+1}: PRIORITY 1 - No transactionId available, skipping to Priority 2...")
           
           # ============================================================
           # Priority 2: Look for status changes (Available, Faulted, Finishing)
           # Only used if Priority 1 did NOT find meterStop with matching transactionId
           # ============================================================
           if primary_stop_idx is None:
               status_stop_idx = search_df[
                   search_df['status'].isin(['Available', 'Faulted', 'Finishing'])
               ].index
               
               if len(status_stop_idx) > 0:
                   primary_stop_idx = status_stop_idx[0]
                   stop_status = sf_reset.loc[primary_stop_idx, 'status']
                   session_info["Stop_Type"] = stop_status
                   # print(f"  ✅ Session {i+1}: PRIORITY 2 - Found {stop_status} at index {primary_stop_idx}")
           
           # Priority 3: Incomplete or No Clear Stop
           if primary_stop_idx is None:
               # No clear stop found - check if still charging
               last_idx = search_end - 1
               last_status = sf_reset.loc[last_idx, 'status'] if last_idx < len(sf_reset) else None
               
               if last_status == "Charging":
                   session_info["Stop_Type"] = "Incomplete"
                   primary_stop_idx = last_idx
                   # print(f"  ⚠️ Session {i+1}: Incomplete (still Charging)")
               else:
                   # Use last event before next session
                   primary_stop_idx = search_end - 1
                   session_info["Stop_Type"] = "No_Clear_Stop"
                   # print(f"  ⚠️ Session {i+1}: No clear stop, using last event at {primary_stop_idx}")
           
           session_info["Session_Stop"] = primary_stop_idx
           
           # -----------------------------
           # 3. Open 2-MINUTE ERROR WINDOW after primary stop
           # -----------------------------
           if 'real_datetime' in sf_reset.columns:
               stop_time = sf_reset.loc[primary_stop_idx, 'real_datetime']
               
               if pd.notna(stop_time):
                   # Define 2-minute window
                   error_window_end_time = stop_time + timedelta(minutes=2)
                   
                   # Find events within error window
                   remaining_df = sf_reset.iloc[primary_stop_idx:search_end]
                   window_events = remaining_df[
                       remaining_df['real_datetime'] <= error_window_end_time
                   ]
                   
                   if len(window_events) > 0:
                       error_window_end_idx = window_events.index[-1]
                       session_info["Error_Window_End"] = error_window_end_idx
                       
                       # Check if we captured additional errors
                       error_count = window_events[
                           (window_events['errorCode'].notna()) | 
                           (window_events['vendorErrorCode'].notna())
                       ].shape[0]
                       
                       # if error_count > 0:
                           # print(f"    📊 Captured {error_count} errors in 2-min window (ends at {error_window_end_idx})")
                   else:
                       session_info["Error_Window_End"] = primary_stop_idx
               else:
                   session_info["Error_Window_End"] = primary_stop_idx
           else:
               session_info["Error_Window_End"] = primary_stop_idx
           
           sessions.append(session_info)

       # -----------------------------
       # 4. Extract session data
       # -----------------------------
       status_cols = {
           "is_Preparing": "Preparing",
           "is_Auto_Start": "Auto-Start",
           "is_REMOTE_Start": "REMOTE-Start",
           "is_RFID_Start": "RFID-Start",
           "is_Charging": "Charging",
       }

       single_value_cols = ["errorCode", "info", "vendorErrorCode", "reason", "StopReason"]

       max_value_cols = {
           "Power.Active.Import": "Power.Active.Import",
           "SoC_EV": "SoC_EV",
       }

       # Initialize DataFrame
       xf = pd.DataFrame(sessions)
       
       for col in status_cols:
           xf[col] = 0

       for col in single_value_cols:
           xf[col] = None

       for col in max_value_cols:
           xf[col] = None

       xf["transactionId"] = None
       xf["session_start_time"] = None
       xf["session_end_time"] = None
       
       # NEW: Additional session metrics
       xf["all_errors"] = None  # List of all errors with timestamps
       xf["session_duration_minutes"] = None
       xf["session_energy_delivered_kwh"] = None
       xf["session_peak_power_kw"] = None

       # -----------------------------
       # 5. Extract session details
       # -----------------------------
       for i in range(len(xf)):
           start = int(xf.loc[i, "Session_Start"])
           stop = int(xf.loc[i, "Session_Stop"])
           error_window_end = int(xf.loc[i, "Error_Window_End"]) if pd.notna(xf.loc[i, "Error_Window_End"]) else stop

           # print(f"\n{'='*60}")
           # print(f"Processing Session {i+1}")
           # print(f"  Start Index: {start}")
           # print(f"  Stop Index: {stop}")
           # print(f"  Error Window End: {error_window_end}")
           # print(f"{'='*60}")

           # Main session data (start to primary stop)
           # NOTE: stop + 1 ensures the stop event itself is INCLUDED
           # This captures reason, StopReason, and other fields from meterStop/Finishing/etc.
           session_df = sf_reset.iloc[start:stop + 1]
           
           # Error window data (primary stop to error window end)
           # NOTE: Starts from stop (not stop+1) to include the stop event in error window
           error_window_df = sf_reset.iloc[stop:error_window_end + 1]
           
           # FULL SESSION DATA (for metrics calculation)
           # NOTE: Includes everything from session start through error window
           full_session_df = sf_reset.iloc[start:error_window_end + 1]

           # Skip if session_df is empty
           if session_df.empty:
               # print(f"  ⚠️ Session {i+1} is empty, skipping...")
               continue

           # Extract session start and end times
           session_start_dt = None
           session_end_dt = None
           
           if 'real_datetime' in session_df.columns:
               start_times = session_df['real_datetime'].dropna()
               if not start_times.empty:
                   session_start_dt = start_times.iloc[0]
                   xf.loc[i, "session_start_time"] = session_start_dt.strftime('%Y-%m-%d %H:%M:%S')
               
               # Use error window end time for session end
               end_times = error_window_df['real_datetime'].dropna()
               if not end_times.empty:
                   session_end_dt = end_times.iloc[-1]
                   xf.loc[i, "session_end_time"] = session_end_dt.strftime('%Y-%m-%d %H:%M:%S')
               
               # Calculate session duration
               if session_start_dt and session_end_dt:
                   duration = session_end_dt - session_start_dt
                   xf.loc[i, "session_duration_minutes"] = round(duration.total_seconds() / 60, 2)

           # Status flags - UPDATED LOGIC for start modes
           statuses = session_df["status"].dropna().unique()
           
           # First, mark all statuses
           for out_col, status_name in status_cols.items():
               xf.loc[i, out_col] = int(status_name in statuses)
           
           # NEW: Determine actual start mode from StartTransactionRequest idTag
           # This overrides the initial status flags for start modes
           start_tx_rows = session_df[session_df["command"] == "StartTransactionRequest"]
           if not start_tx_rows.empty and "idTag" in start_tx_rows.columns:
               # Get the idTag from StartTransactionRequest
               start_id_tag = start_tx_rows["idTag"].dropna()
               if not start_id_tag.empty:
                   actual_id_tag = str(start_id_tag.iloc[0])
                   
                   # Reset all start mode flags to 0
                   xf.loc[i, "is_Auto_Start"] = 0
                   xf.loc[i, "is_REMOTE_Start"] = 0
                   xf.loc[i, "is_RFID_Start"] = 0
                   
                   # Set the correct start mode based on idTag
                   if "VID" in actual_id_tag:
                       xf.loc[i, "is_Auto_Start"] = 1
                   elif len(actual_id_tag) == 8:
                       xf.loc[i, "is_RFID_Start"] = 1
                   else:
                       # Default to REMOTE-Start for all other cases
                       xf.loc[i, "is_REMOTE_Start"] = 1

           # ========================================
           # FIX: IMPROVED transactionId EXTRACTION with SMART FILTERING
           # Strategy:
           # 1. Look for StartTransactionRequest/Response in forward direction (CMS data)
           # 2. If not found, look backward but ONLY for matching connector (S3 data)
           # 3. Filter by command type to avoid picking up wrong transactions
           # 4. Exclude transactionIds already assigned to previous sessions
           # 5. If still not found, expand search range significantly
           # ========================================
           
           # Get current session's connector ID
           session_connector_id = None
           if 'connectorId' in session_df.columns:
               connector_ids = session_df['connectorId'].dropna()
               if not connector_ids.empty:
                   session_connector_id = str(connector_ids.iloc[0])
           
           # NEW: Get list of transactionIds already assigned to previous sessions
           already_assigned_tids = set()
           if i > 0:
               already_assigned_tids = set(xf.loc[:i-1, 'transactionId'].dropna().astype(str))
               # if already_assigned_tids:
               #    print(f"     ⚠️ Excluding {len(already_assigned_tids)} transactionIds from previous sessions: {already_assigned_tids}")
           
           # Calculate BACKWARD search boundary (limited to avoid picking old sessions)
           # Only go back maximum 200 rows (increased from 100) or to previous session
           if i > 0:
               backward_search_start = max(starts[i - 1], start - 200)
           else:
               backward_search_start = max(0, start - 200)
           
           # Calculate FORWARD search boundary (until next session or end of file)
           if i + 1 < len(starts):
               forward_search_end = starts[i + 1]
           else:
               forward_search_end = len(sf_reset)
           
           # print(f"\n  🔍 Searching for transactionId:")
           # print(f"     Session Connector ID: {session_connector_id}")
           # print(f"     Backward search: {backward_search_start} to {start} (max 200 rows back)")
           # print(f"     Forward search: {start} to {forward_search_end}")
           
           transaction_id_found = None
           
           if "transactionId" in sf_reset.columns:
               # ============================================
               # PRIORITY 1: FORWARD SEARCH (CMS data pattern)
               # Look for StartTransactionResponse or any row with transactionId
               # ============================================
               forward_range = sf_reset.iloc[start:forward_search_end]
               
               # DEBUG: Show what we're searching
               # print(f"     DEBUG: Forward range has {len(forward_range)} rows (indices {start} to {forward_search_end-1})")
               # if 'transactionId' in forward_range.columns:
               #    tids_in_range = forward_range['transactionId'].dropna()
               #    print(f"     DEBUG: Found {len(tids_in_range)} non-null transactionIds in forward range")
               #    if not tids_in_range.empty:
               #        print(f"     DEBUG: TransactionIds in range: {tids_in_range.tolist()}")
               
               # First try: Look for StartTransactionRequest with matching connector
               if 'command' in forward_range.columns:
                   start_tx_requests = forward_range[
                       (forward_range['command'] == 'StartTransactionRequest') &
                       (forward_range['transactionId'].notna())
                   ]
                   
                   if not start_tx_requests.empty:
                       # If we have connector ID, filter by it
                       if session_connector_id:
                           start_tx_requests = start_tx_requests[
                               start_tx_requests['connectorId'].astype(str) == session_connector_id
                           ]
                       
                       # NEW: Exclude already assigned transactionIds
                       if already_assigned_tids:
                           start_tx_requests = start_tx_requests[
                               ~start_tx_requests['transactionId'].astype(str).isin(already_assigned_tids)
                           ]
                       
                       if not start_tx_requests.empty:
                           transaction_id_found = start_tx_requests['transactionId'].iloc[0]
                           # print(f"     ✅ Found in FORWARD StartTransactionRequest: {transaction_id_found}")
               
               # Second try: Look for StartTransactionResponse
               # NOTE: StartTransactionResponse often doesn't have connectorId, so we don't filter by it
               if not transaction_id_found and 'command' in forward_range.columns:
                   start_tx_responses = forward_range[
                       (forward_range['command'] == 'StartTransactionResponse') &
                       (forward_range['transactionId'].notna())
                   ]
                   
                   # NEW: Exclude already assigned transactionIds
                   if already_assigned_tids:
                       start_tx_responses = start_tx_responses[
                           ~start_tx_responses['transactionId'].astype(str).isin(already_assigned_tids)
                       ]
                   
                   if not start_tx_responses.empty:
                       transaction_id_found = start_tx_responses['transactionId'].iloc[0]
                       # print(f"     ✅ Found in FORWARD StartTransactionResponse: {transaction_id_found}")
               
               # Third try: Look for StopTransactionRequest (reliable source)
               if not transaction_id_found and 'command' in forward_range.columns:
                   stop_tx_requests = forward_range[
                       (forward_range['command'] == 'StopTransactionRequest') &
                       (forward_range['transactionId'].notna())
                   ]
                   
                   # NEW: Exclude already assigned transactionIds
                   if already_assigned_tids:
                       stop_tx_requests = stop_tx_requests[
                           ~stop_tx_requests['transactionId'].astype(str).isin(already_assigned_tids)
                       ]
                   
                   if not stop_tx_requests.empty:
                       transaction_id_found = stop_tx_requests['transactionId'].iloc[0]
                       # print(f"     ✅ Found in FORWARD StopTransactionRequest: {transaction_id_found}")
               
               # Fourth try: Any row with transactionId in forward range
               if not transaction_id_found:
                   forward_tids = forward_range['transactionId'].dropna()
                   
                   # NEW: Exclude already assigned transactionIds
                   if already_assigned_tids:
                       forward_tids = forward_tids[~forward_tids.astype(str).isin(already_assigned_tids)]
                   
                   if not forward_tids.empty:
                       transaction_id_found = forward_tids.iloc[0]
                       # print(f"     ✅ Found in FORWARD range (any row): {transaction_id_found}")
               
               # ============================================
               # PRIORITY 2: BACKWARD SEARCH (S3 reversed data pattern)
               # Only if forward search failed
               # ============================================
               if not transaction_id_found:
                   backward_range = sf_reset.iloc[backward_search_start:start]
                   
                   # First try: Look for StartTransactionResponse with matching connector (most reliable for S3)
                   if 'command' in backward_range.columns:
                       start_tx_responses = backward_range[
                           (backward_range['command'] == 'StartTransactionResponse') &
                           (backward_range['transactionId'].notna())
                       ]
                       
                       # NEW: Exclude already assigned transactionIds FIRST
                       if already_assigned_tids:
                           start_tx_responses = start_tx_responses[
                               ~start_tx_responses['transactionId'].astype(str).isin(already_assigned_tids)
                           ]
                       
                       # Filter by connector if we have it
                       if not start_tx_responses.empty and session_connector_id:
                           # Check if connectorId matches
                           matching_responses = start_tx_responses[
                               start_tx_responses['connectorId'].astype(str) == session_connector_id
                           ]
                           
                           if not matching_responses.empty:
                               # Take the LAST one (closest to session start)
                               transaction_id_found = matching_responses['transactionId'].iloc[-1]
                               # print(f"     ✅ Found in BACKWARD StartTransactionResponse (connector match): {transaction_id_found}")
                           elif not start_tx_responses.empty:
                               # No connector match, take the last one anyway
                               transaction_id_found = start_tx_responses['transactionId'].iloc[-1]
                               # print(f"     ⚠️ Found in BACKWARD StartTransactionResponse (no connector filter): {transaction_id_found}")
                   
                   # Second try: Look for StartTransactionRequest in backward range
                   if not transaction_id_found and 'command' in backward_range.columns:
                       start_tx_requests = backward_range[
                           (backward_range['command'] == 'StartTransactionRequest') &
                           (backward_range['transactionId'].notna())
                       ]
                       
                       # NEW: Exclude already assigned transactionIds
                       if already_assigned_tids:
                           start_tx_requests = start_tx_requests[
                               ~start_tx_requests['transactionId'].astype(str).isin(already_assigned_tids)
                           ]
                       
                       # Filter by connector
                       if not start_tx_requests.empty and session_connector_id:
                           matching_requests = start_tx_requests[
                               start_tx_requests['connectorId'].astype(str) == session_connector_id
                           ]
                           
                           if not matching_requests.empty:
                               transaction_id_found = matching_requests['transactionId'].iloc[-1]
                               # print(f"     ✅ Found in BACKWARD StartTransactionRequest (connector match): {transaction_id_found}")
                   
                   # Third try: Filter backward search by avoiding old completed transactions
                   # Look for MeterValues or StopTransaction to identify transaction boundaries
                   if not transaction_id_found:
                       # Get all transactionIds in backward range
                       backward_tids = backward_range['transactionId'].dropna()
                       
                       # NEW: Exclude already assigned transactionIds
                       if already_assigned_tids:
                           backward_tids = backward_tids[~backward_tids.astype(str).isin(already_assigned_tids)]
                       
                       if not backward_tids.empty:
                           # Check if there's a StopTransaction with this transactionId (means it's already finished)
                           if 'command' in backward_range.columns:
                               # Get the last transactionId
                               candidate_tid = backward_tids.iloc[-1]
                               
                               # Check if this transaction was already stopped
                               stop_tx = backward_range[
                                   (backward_range['command'].isin(['StopTransactionRequest', 'StopTransactionResponse'])) &
                                   (backward_range['transactionId'].astype(str) == str(candidate_tid))
                               ]
                               
                               if stop_tx.empty:
                                   # Transaction not stopped yet, probably belongs to this session
                                   transaction_id_found = candidate_tid
                                   # print(f"     ✅ Found in BACKWARD range (unclosed transaction): {transaction_id_found}")
                               else:
                                   pass
                                   # print(f"     ⚠️ Found transactionId {candidate_tid} but it was already stopped - skipping")
               
               # ============================================
               # PRIORITY 3: EXPANDED SEARCH (for edge cases)
               # If still not found and session is charging, expand search significantly
               # ============================================
               if not transaction_id_found and xf.loc[i, "is_Charging"] == 1:
                   # print(f"     ⚠️ Charging session without transactionId - expanding search range...")
                   
                   # Expand backward search to cover more ground (up to 500 rows or start of file)
                   expanded_backward_start = max(0, start - 500)
                   expanded_backward_range = sf_reset.iloc[expanded_backward_start:start]
                   
                   # Look for ANY transactionId in expanded range with connector match
                   if 'command' in expanded_backward_range.columns and session_connector_id:
                       all_tx_in_range = expanded_backward_range[
                           expanded_backward_range['transactionId'].notna()
                       ]
                       
                       # Exclude already assigned
                       if already_assigned_tids:
                           all_tx_in_range = all_tx_in_range[
                               ~all_tx_in_range['transactionId'].astype(str).isin(already_assigned_tids)
                           ]
                       
                       # Filter by connector
                       connector_match = all_tx_in_range[
                           all_tx_in_range['connectorId'].astype(str) == session_connector_id
                       ]
                       
                       if not connector_match.empty:
                           # Take the last one (closest to session)
                           transaction_id_found = connector_match['transactionId'].iloc[-1]
                           # print(f"     ✅ Found in EXPANDED BACKWARD search (connector {session_connector_id}): {transaction_id_found}")
               
               if transaction_id_found:
                   xf.loc[i, "transactionId"] = transaction_id_found
               else:
                   pass
                   # print(f"     ❌ No valid transactionId found for this session")
           else:
               pass
               # print(f"     ❌ transactionId column not found in DataFrame")

           # ========================================
           # NEW: CAPTURE ALL ERRORS WITH TIMESTAMPS (ROW-BY-ROW)
           # ========================================
           all_errors = []
           
           # Collect from full session (including error window) row by row
           for idx in full_session_df.index:
               row = full_session_df.loc[idx]
               
               # Extract all error-related fields for this row
               error_code = row.get('errorCode', None)
               info = row.get('info', None)
               vendor_error = row.get('vendorErrorCode', None)
               reason = row.get('reason', None)
               stop_reason = row.get('StopReason', None)
               timestamp = row.get('real_datetime', None)
               
               # Check if this row has any error information
               has_error = False
               for val in [error_code, info, vendor_error, reason, stop_reason]:
                   if pd.notna(val) and str(val).strip() not in ["", "None", "nan", "NoError"]:
                       has_error = True
                       break
               
               # If row has error info, add as dict with timestamp
               if has_error:
                   error_dict = {}
                   
                   # Add timestamp first
                   if pd.notna(timestamp):
                       error_dict['timestamp'] = timestamp.strftime('%Y-%m-%d %H:%M:%S')
                   else:
                       error_dict['timestamp'] = None
                   
                   # Add error fields only if they have values
                   if pd.notna(error_code) and str(error_code).strip() not in ["", "None", "nan", "NoError"]:
                       error_dict['errorCode'] = str(error_code)
                   
                   if pd.notna(info) and str(info).strip() not in ["", "None", "nan", "NoError"]:
                       error_dict['info'] = str(info)
                   
                   if pd.notna(vendor_error) and str(vendor_error).strip() not in ["", "None", "nan", "NoError"]:
                       error_dict['vendorErrorCode'] = str(vendor_error)
                   
                   if pd.notna(reason) and str(reason).strip() not in ["", "None", "nan", "NoError"]:
                       error_dict['reason'] = str(reason)
                   
                   if pd.notna(stop_reason) and str(stop_reason).strip() not in ["", "None", "nan", "NoError"]:
                       error_dict['StopReason'] = str(stop_reason)
                   
                   # Only add if we have more than just timestamp
                   if len(error_dict) > 1:
                       all_errors.append(error_dict)
           
           # Store errors as list
           xf.at[i, "all_errors"] = all_errors if all_errors else None

           # ========================================
           # NEW: CALCULATE ENERGY DELIVERED
           # ========================================
           # Look for meterStart and meterStop first
           meter_start = None
           meter_stop = None
           
           if "meterStart" in session_df.columns:
               ms = pd.to_numeric(session_df["meterStart"], errors="coerce").dropna()
               if not ms.empty:
                   meter_start = ms.iloc[0]
           
           if "meterStop" in full_session_df.columns:
               # Look for meterStop in full session
               ms = pd.to_numeric(full_session_df["meterStop"], errors="coerce").dropna()
               if not ms.empty:
                   meter_stop = ms.iloc[-1]  # Take last meterStop
           
           # If no meterStop, use last Energy.Active.Import.Register value
           if meter_stop is None and "Energy.Active.Import.Register" in full_session_df.columns:
               energy_vals = pd.to_numeric(
                   full_session_df["Energy.Active.Import.Register"], 
                   errors="coerce"
               ).dropna()
               if not energy_vals.empty:
                   meter_stop = energy_vals.iloc[-1]
           
           # Calculate energy delivered
           if meter_start is not None and meter_stop is not None:
               energy_wh = meter_stop - meter_start
               energy_kwh = energy_wh / 1000  # Convert Wh to kWh
               xf.loc[i, "session_energy_delivered_kwh"] = round(energy_kwh, 3)

           # ========================================
           # NEW: CALCULATE PEAK POWER IN SESSION
           # ========================================
           if "Power.Active.Import" in full_session_df.columns:
               power_vals = pd.to_numeric(
                   full_session_df["Power.Active.Import"], 
                   errors="coerce"
               ).dropna()
               if not power_vals.empty:
                   peak_power_w = power_vals.max()
                   peak_power_kw = peak_power_w / 1000
                   xf.loc[i, "session_peak_power_kw"] = round(peak_power_kw, 2)

           # Single-value fields - KEEP ORIGINAL LOGIC for backward compatibility
           # But prioritize error window data
           for col in single_value_cols:
               # First check error window for this field
               if col in error_window_df.columns:
                   window_val = error_window_df[col].dropna()
                   if not window_val.empty:
                       xf.loc[i, col] = window_val.iloc[-1]  # Use last value in error window
                       continue
               
               # Fallback to session data
               if col in session_df.columns:
                   val = session_df[col].dropna()
                   xf.loc[i, col] = val.iloc[-1] if not val.empty else None

           # Max numeric fields (keep original for SoC)
           for out_col, src_col in max_value_cols.items():
               if src_col in session_df.columns:
                   xf.loc[i, out_col] = pd.to_numeric(
                       session_df[src_col], errors="coerce"
                   ).max()

       # -----------------------------
       # 6. Create session-level DataFrame
       # -----------------------------
       df_session_cols = [
           "Session_Start",
           "Session_Stop",
           "Stop_Type",
           "Error_Window_End",
           "is_Preparing",
           "is_Auto_Start",
           "is_REMOTE_Start",
           "is_RFID_Start",
           "is_Charging",
           "transactionId",
           "session_start_time",
           "session_end_time",
           "session_duration_minutes",
           "session_energy_delivered_kwh",
           "session_peak_power_kw",
           "all_errors"
       ]

       df_session = xf[df_session_cols].copy()

       # -----------------------------
       # 7. Transaction-level DataFrame
       # -----------------------------
       agg_dict = {}
       if "errorCode" in xf.columns:
           agg_dict["errorCode"] = "first"
       if "info" in xf.columns:
           agg_dict["info"] = "first"
       if "vendorErrorCode" in xf.columns:
           agg_dict["vendorErrorCode"] = "first"
       if "reason" in xf.columns:
           agg_dict["reason"] = "first"
       if "StopReason" in xf.columns:
           agg_dict["StopReason"] = "first"
       if "Power.Active.Import" in xf.columns:
           agg_dict["Power.Active.Import"] = "max"
       if "SoC_EV" in xf.columns:
           agg_dict["SoC_EV"] = "max"
       
       if agg_dict:
           df_transaction = (
               xf.groupby("transactionId", dropna=True, as_index=False)
                   .agg(agg_dict)
           )
       else:
           df_transaction = pd.DataFrame(columns=["transactionId"])

       # -----------------------------
       # 8. Merge session + transaction
       # -----------------------------
       final_df = df_session.merge(
           df_transaction,
           on="transactionId",
           how="left"
       )

       # ========================================
       # FINAL VERIFICATION: Check for null transactionIds
       # ========================================
       # print(f"\n{'='*60}")
       # print(f"FINAL VERIFICATION: transactionId Status")
       # print(f"{'='*60}")
       
       # null_tid_count = final_df["transactionId"].isna().sum()
       # total_sessions = len(final_df)
       
       # print(f"Total sessions: {total_sessions}")
       # print(f"Sessions with null transactionId: {null_tid_count}")
       # print(f"Sessions with valid transactionId: {total_sessions - null_tid_count}")
       
       # if null_tid_count > 0:
       #    print(f"\n⚠️ WARNING: {null_tid_count} session(s) have null transactionId")
       #    print(f"This usually means:")
       #    print(f"  1. The session never reached StartTransaction phase")
       #    print(f"  2. The transactionId appears outside the session boundary")
       #    print(f"  3. The OCPP log is missing transactionId data")
           
       #    # Show which sessions have null transactionId
       #    null_sessions = final_df[final_df["transactionId"].isna()]
       #    for idx, row in null_sessions.iterrows():
       #        print(f"\n  Session {idx + 1} (NULL transactionId):")
       #        print(f"    Stop_Type: {row.get('Stop_Type', 'N/A')}")
       #        print(f"    is_Charging: {row.get('is_Charging', 'N/A')}")
       #        print(f"    Start: {row.get('session_start_time', 'N/A')}")
       #        print(f"    End: {row.get('session_end_time', 'N/A')}")
       
       # print(f"{'='*60}\n")

       return final_df
   
   # Process both connectors
   x = report_df(df1)
   y = report_df(df2)
   
   # =====================================================
   # 🔔 DETECT IDLE TIME ERRORS (before dropping session boundaries)
   # =====================================================
   idle_errors_c1 = []
   idle_errors_c2 = []
   
   if not x.empty and all(col in x.columns for col in ['Session_Start', 'Session_Stop', 'Error_Window_End']):
       print("\n🔍 Detecting idle time errors for Connector 1...")
       idle_errors_c1 = detect_idle_errors(df1, x)
   
   if not y.empty and all(col in y.columns for col in ['Session_Start', 'Session_Stop', 'Error_Window_End']):
       print("\n🔍 Detecting idle time errors for Connector 2...")
       idle_errors_c2 = detect_idle_errors(df2, y)
   
   # Drop internal processing columns before returning to user
   cols_to_drop = ['Session_Start', 'Session_Stop', 'Error_Window_End']
   
   if not x.empty:
       existing_cols = [col for col in cols_to_drop if col in x.columns]
       if existing_cols:
           x = x.drop(columns=existing_cols)
   
   if not y.empty:
       existing_cols = [col for col in cols_to_drop if col in y.columns]
       if existing_cols:
           y = y.drop(columns=existing_cols)

   # =====================================================
   # 🔥 ENHANCED SESSION CLASSIFICATION LOGIC - PRIORITY-BASED
   # =====================================================
   def set_stop(row):
       """
       Priority-based stop classification matching session closing logic:
       
       Priority 1: meterStop (HIGHEST)
         - If Stop_Type is 'meterStop', classify based on errors/reason
         - Takes precedence over Finishing/Available/Faulted
       
       Priority 2: Status Transitions (MEDIUM)
         - Finishing, Available, Faulted
         - Only used if Stop_Type is NOT meterStop
       
       Priority 3: Incomplete (LOW)
         - Session never completed properly
       """
       try:
           # Get Stop_Type (from session closing logic)
           stop_type = row.get('Stop_Type', None)
           
           # ============================================================
           # PRIORITY 3: Incomplete sessions (check first for early exit)
           # ============================================================
           if stop_type == "Incomplete":
               return "Incomplete"
           
           # Pre-charging failure (never reached Charging status)
           if row.get('is_Charging', 0) == 0:
               return None  # Precharging Failure
           
           # Get relevant fields
           reason = row.get('reason', None)
           stop_reason = row.get('StopReason', None)
           soc = pd.to_numeric(row.get('SoC_EV', None), errors='coerce')
           all_errors = row.get('all_errors', None)
           
           # Check if session has errors (excluding NoError and successful stop reasons)
           has_real_errors = False
           if all_errors and isinstance(all_errors, list):
               for error_dict in all_errors:
                   if isinstance(error_dict, dict):
                       # Check each error field
                       for key, val in error_dict.items():
                           if key != 'timestamp' and val:
                               val_str = str(val)
                               
                               # Exclude successful stop reasons and patterns
                               successful_patterns = [
                                   "NoError",
                                   "Local", 
                                   "Remote", 
                                   "UserRequestedStop",
                                   "None",
                                   "StopReason:NoError",
                                   "StopReason:Local",
                                   "StopReason:Remote",
                                   "StopReason:UserRequestedStop"
                               ]
                               
                               if val_str not in successful_patterns:
                                   has_real_errors = True
                                   break
                   if has_real_errors:
                       break
           
           # SoC Override: If 99% or 100%, always successful
           if pd.notna(soc) and soc >= 99.0:
               return "Successful"
           
           # ============================================================
           # PRIORITY 1: meterStop (HIGHEST PRIORITY)
           # ============================================================
           if stop_type == "meterStop":
               # Check reason field (PRIORITY 1 within meterStop)
               if pd.notna(reason):
                   if reason in ["Remote", "Local"]:
                       return "Successful"
                   elif reason == "EVDisconnected":
                       # Check SoC (already checked >= 99 above)
                       return "Failed / Error"
                   elif reason == "Reboot":
                       return "Failed / Error" if has_real_errors else "Successful"

               # Check StopReason (PRIORITY 2 within meterStop)
               if pd.notna(stop_reason):
                   if stop_reason in ["NoError", "Local", "Remote", "UserRequestedStop"]:
                       return "Successful"
                   else:
                       return "Failed / Error"
               
               # No clear reason/StopReason, check for errors
               if has_real_errors:
                   return "Failed / Error"
               else:
                   return "Successful"
           
           # ============================================================
           # PRIORITY 2: Status Transitions (MEDIUM PRIORITY)
           # ============================================================
           # Only reached if Stop_Type is NOT meterStop
           
           if stop_type == "Faulted":
               return "Failed / Error"
           
           if stop_type in ["Available", "Finishing"]:
               # Check reason field (PRIORITY 1 within Available/Finishing)
               if pd.notna(reason):
                   if reason in ["Remote", "Local"]:
                       return "Successful"
                   elif reason == "EVDisconnected":
                       return "Failed / Error"
                   elif reason == "Reboot":
                       return "Failed / Error" if has_real_errors else "Successful"

               # Check StopReason (PRIORITY 2 within Available/Finishing)
               if pd.notna(stop_reason):
                   if stop_reason in ["NoError", "Local", "Remote", "UserRequestedStop"]:
                       return "Successful"
                   else:
                       return "Failed / Error"
               
               # No clear reason/StopReason, check for errors
               if has_real_errors:
                   return "Failed / Error"
               else:
                   return "Successful"
           
           # Default: Unknown stop type
           return "Failed / Error"
           
       except Exception as e:
           print(f"Error in set_stop: {e}, row: {row.to_dict()}")
           return "Failed / Error"
   
   # Apply stop classification
   if not x.empty:
       x["stop"] = x.apply(set_stop, axis=1)
   if not y.empty:
       y["stop"] = y.apply(set_stop, axis=1)

   def set_vendorErrorCode(row):
       """
       Extract primary error for display.
       Now we have all_errors list, but keep vendorErrorCode as primary error for compatibility
       """
       try:
           # Pre-charging failure
           if row['is_Charging'] == 0:
               return "Precharging Failure"
           
           # NEW: If we have all_errors list, use first significant error
           all_errors = row.get('all_errors', None)
           if all_errors and isinstance(all_errors, list) and len(all_errors) > 0:
               # Return first error dict's first non-timestamp value
               first_error = all_errors[0]
               if isinstance(first_error, dict):
                   for key, val in first_error.items():
                       if key != 'timestamp' and val:
                           return val
           
           # FALLBACK: Original logic
           info = row.get('info', None)
           vendor_error = row.get('vendorErrorCode', None)
           reason = row.get('reason', None)
           stop_reason = row.get('StopReason', None)
           
           # Priority 1: info field (most descriptive)
           if pd.notna(info) and info != '':
               return info
           
           # Priority 2: vendorErrorCode field
           if pd.notna(vendor_error) and vendor_error != '':
               return vendor_error
           
           # Priority 3: StopReason
           if pd.notna(stop_reason) and stop_reason not in ["NoError"]:
               return stop_reason
           
           # Priority 4: Check EVDisconnected with low SoC
           if reason == "EVDisconnected":
               soc = pd.to_numeric(row.get('SoC_EV', None), errors='coerce')
               if pd.notna(soc) and soc < 99.0:
                   return "EVDisconnected"
           
           return None
           
       except Exception as e:
           print(f"Error in set_vendorErrorCode: {e}, row: {row.to_dict()}")
           return None
   
   # Apply error code extraction
   if not x.empty:
       x["vendorErrorCode"] = x.apply(set_vendorErrorCode, axis=1)
   if not y.empty:
       y["vendorErrorCode"] = y.apply(set_vendorErrorCode, axis=1)

   # Remove last row if it's truly incomplete (no reason and still charging)
   # Note: We now handle this with Stop_Type="Incomplete" flag instead
   # But keeping this for backwards compatibility
   if len(x) > 0:
       last_row = x.iloc[-1]
       if last_row.get('reason') == None and last_row.get('is_Charging') == 1 and last_row.get('stop') != "Incomplete":
           x = x.iloc[:-1]
   
   if len(y) > 0:
       last_row = y.iloc[-1]
       if last_row.get('reason') == None and last_row.get('is_Charging') == 1 and last_row.get('stop') != "Incomplete":
           y = y.iloc[:-1]
       
   # Convert to JSON
   x1 = x.to_json(orient='records', indent=4)
   y1 = y.to_json(orient='records', indent=4)

   # Build summaries with json_safe and idle errors
   x_json = json_safe(build_summary(x, idle_errors_c1))
   y_json = json_safe(build_summary(y, idle_errors_c2))

   # Get CP details
   cp_id = None
   if 'cp_id' in df.columns and len(df) > 0:
       cp_id = str(df['cp_id'].iloc[0])
       print(f"CP ID: {cp_id}")

   info_data = "[]"
   if cp_id:
       try:
           cp_info = cp_details(cp_id)
           info_data = cp_info.to_json(orient='records', indent=4)
       except Exception as e:
           print(f"Error getting CP details: {e}")
           info_data = "[]"

   # Get date details
   date_info = {}
   if 'date' in df.columns and len(df) > 0:
       date_info = date_details(df['date'])

   return {
       "info": info_data,
       "date": date_info,
       "Connector1": x1,
       "Connector2": y1,
       "report_1": x_json,
       "report_2": y_json
   }