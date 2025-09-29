# Data Storage Strategy for CVD Detection App

## Current Storage (Development)
- ✅ **In-memory storage** (backend/main.py) - Good for development
- ✅ **AsyncStorage** (mobile app) - Local device storage

## Production Storage Options

### 1. Database for Backend (Recommended)

#### Option A: PostgreSQL (Most Recommended)
```python
# Why PostgreSQL?
# - HIPAA compliant for medical data
# - Excellent JSON support for medical records
# - Strong ACID compliance
# - Great for analytics and reporting
# - Scalable for production

# Installation
pip install sqlalchemy psycopg2-binary alembic

# Connection string
DATABASE_URL = "postgresql://user:password@localhost:5432/cvd_db"
```

#### Option B: MongoDB (Good for Medical Data)
```python
# Why MongoDB?
# - Excellent for medical documents/records
# - Flexible schema for different data types
# - Good for storing medical images metadata
# - Easy to scale

pip install motor pymongo

# Connection
MONGODB_URL = "mongodb://localhost:27017/cvd_database"
```

#### Option C: SQLite (Simple Start)
```python
# Why SQLite?
# - No setup required
# - Perfect for development and small deployments
# - HIPAA compliant
# - Easy backup

DATABASE_URL = "sqlite:///./cvd_app.db"
```

### 2. Mobile App Storage

#### Current: AsyncStorage ✅
```typescript
// Already implemented in your app
// Good for:
// - User preferences
// - Authentication tokens
// - Offline data cache
// - Small user data

import AsyncStorage from '@react-native-async-storage/async-storage';
```

#### Enhanced: SQLite for Mobile
```typescript
// For larger datasets
npm install expo-sqlite

// Good for:
// - Offline-first apps
// - Large datasets
// - Complex queries
// - Medical history storage
```

### 3. File Storage (Medical Data)

#### Option A: Local File System (Current)
```python
# backend/main.py - already implemented
UPLOAD_DIR = "./uploads"
# Good for development
```

#### Option B: Cloud Storage (Production)
```python
# AWS S3
pip install boto3

# Google Cloud Storage
pip install google-cloud-storage

# Azure Blob Storage
pip install azure-storage-blob
```

## Recommended Architecture for CVD App

### Phase 1: Enhanced Development Setup
```python
# backend/requirements.txt (add these)
sqlalchemy==2.0.23
alembic==1.13.1
sqlite3  # Built into Python

# Use SQLite for easy setup
DATABASE_URL = "sqlite:///./cvd_development.db"
```

### Phase 2: Production Setup
```python
# PostgreSQL for production
DATABASE_URL = "postgresql://user:pass@localhost:5432/cvd_production"

# Redis for caching
REDIS_URL = "redis://localhost:6379"

# Cloud storage for files
AWS_S3_BUCKET = "cvd-medical-data"
```

## Medical Data Considerations

### HIPAA Compliance Requirements
```python
# Database encryption
ENCRYPT_DATABASE = True
DATABASE_ENCRYPTION_KEY = "your-encryption-key"

# Data retention policies
DATA_RETENTION_DAYS = 2555  # 7 years for medical data

# Audit logging
AUDIT_LOG_ENABLED = True
```

### Data Types to Store
```python
# User Data
- User profiles
- Authentication data
- Preferences

# Medical Data
- Assessment results
- Medical history
- Uploaded files (ECG, images)
- AI model predictions

# Analytics Data
- Usage statistics
- Model performance metrics
- Feedback data

# Audit Data
- Access logs
- Data changes
- Security events
```

## Implementation Plan

### Step 1: Add SQLite Database (Quick Start)
```python
# backend/database.py
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./cvd_app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    name = Column(String)
    age = Column(Integer)
    gender = Column(String)
    height = Column(Float)
    weight = Column(Float)
    medical_history = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(String, unique=True, index=True)
    user_id = Column(String, index=True)
    risk_score = Column(Float)
    risk_level = Column(String)
    recommendations = Column(JSON)
    confidence = Column(Float)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)
```

### Step 2: Database Service
```python
# backend/database_service.py
from sqlalchemy.orm import Session
from database import SessionLocal, User, Prediction

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_user(db: Session, user_data: dict):
    db_user = User(**user_data)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user(db: Session, user_id: str):
    return db.query(User).filter(User.user_id == user_id).first()

def create_prediction(db: Session, prediction_data: dict):
    db_prediction = Prediction(**prediction_data)
    db.add(db_prediction)
    db.commit()
    db.refresh(db_prediction)
    return db_prediction
```

### Step 3: Update Main API
```python
# backend/main.py (update imports)
from database_service import get_db, create_user, get_user, create_prediction
from sqlalchemy.orm import Session

# Update endpoints to use database
@app.post("/api/v1/users/profile")
async def create_user_profile(profile: UserProfile, db: Session = Depends(get_db)):
    db_user = create_user(db, profile.dict())
    return {"message": "Profile created successfully", "user_id": profile.user_id}

@app.get("/api/v1/users/profile/{user_id}")
async def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    db_user = get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
```

## Quick Start Recommendation

### For Immediate Development:
1. **Keep current in-memory storage** - it's working fine for development
2. **Add SQLite database** when you want persistence
3. **Use AsyncStorage** for mobile offline storage

### For Production:
1. **PostgreSQL** for main database
2. **Redis** for caching and sessions
3. **AWS S3/Google Cloud** for file storage
4. **Backup strategy** for medical data compliance

Would you like me to implement the SQLite database setup first, or do you want to continue with the current in-memory storage for now?