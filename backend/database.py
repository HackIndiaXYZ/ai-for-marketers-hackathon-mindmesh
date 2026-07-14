from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

# 1. Setup SQLite Engine
SQLALCHEMY_DATABASE_URL = "sqlite:///./apex.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 2. Setup Session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 3. Define the Upgraded Model (Pipeline History & Brand Memory)
class CampaignData(Base):
    __tablename__ = "campaign_data"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    status = Column(String, default="Pending Analysis")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Brand Memory Features
    brand_name = Column(String, nullable=True, default="Unknown Brand")
    brand_tone = Column(String, nullable=True, default="Professional")
    
    # Saved Output States for Pipeline History & Export
    insights = Column(Text, nullable=True)
    dashboard_config = Column(Text, nullable=True)
    strategy_config = Column(Text, nullable=True)
    audit_config = Column(Text, nullable=True)
    sim_config = Column(Text, nullable=True)
    deploy_config = Column(Text, nullable=True)

# Create the tables in the database
Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()