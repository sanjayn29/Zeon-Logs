# ⚡ Zeon Logs – OCPP EV Charger Log Analytics Platform

**Zeon Logs** is a modern web application designed to analyze and manage **OCPP (Open Charge Point Protocol)** charger log files. It transforms raw EV charging logs into meaningful insights, helping operators and developers understand charger behavior, session performance, and energy usage.

---

## 🚀 Project Overview

Electric Vehicle charging stations generate large volumes of event-based logs that are difficult to interpret manually.  
Zeon Logs automates this process by:

- Normalizing raw OCPP log data  
- Reconstructing charging sessions  
- Computing detailed analytics  
- Presenting both per-file and cumulative insights through a clean dashboard  

---

## 🧩 Core Functionality

### 📂 Log File Upload
- Upload **CSV / Excel** files containing OCPP charger logs
- Supports logs with multiple connectors
- Files are processed directly in the backend (no raw file storage)

### 🔄 Data Normalization
- Standardizes vendor-specific OCPP log formats
- Extracts structured data from nested JSON payloads
- Converts raw events into session-level records

### 📊 Analytics Dashboard
- Displays **cumulative metrics** across all user uploads
- Tracks charging behavior over time
- Highlights charger performance and reliability

### 🧠 Interactive Chat
- Ask questions about charger behavior and sessions
- Conversational querying over analyzed log data

### 🔐 User Authentication
- Firebase-based Google authentication
- Each user’s uploads and analytics are isolated

## 🏗️ Architecture

Zeon Logs follows a **client-server architecture**:


### Backend Responsibilities
- Parse OCPP events (`StartTransaction`, `StopTransaction`, `MeterValues`)
- Reconstruct charging sessions
- Compute analytics per connector
- Store processed results in Firestore

### Frontend Responsibilities
- File upload and user authentication
- Display normalization and dashboard views
- Aggregate metrics across uploads
- Provide interactive chat interface

---

## 🛠️ Technology Stack

### Frontend
- **React 18 + TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** + **shadcn/ui**
- **TanStack Query** (data fetching)
- **React Router**
- **Firebase Authentication**

### Backend
- **Python FastAPI**
- **Firebase Firestore** (database)
- **Pandas** (data processing)
- **ReportLab** (PDF generation)
---

# 👨‍💻 Developer

**Sanjay N**

🚀 Freelancer  

🌐 Portfolio: https://sanjayn.me  
💼 LinkedIn: https://linkedin.com/in/sanjayn29  
🐙 GitHub: https://github.com/sanjayn29  

---

# ⭐ Support

If you like this project, consider giving it a **star ⭐ on GitHub** to support the development.
