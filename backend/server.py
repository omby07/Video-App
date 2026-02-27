from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class VideoMetadata(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    duration: float  # in seconds
    quality: str  # "lo-res", "hd", "full-hd"
    background_type: Optional[str] = None  # "predefined", "custom", "blur", "color"
    background_value: Optional[str] = None
    filters_applied: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    video_data: str  # base64 encoded video
    thumbnail: Optional[str] = None  # base64 encoded thumbnail

class VideoMetadataCreate(BaseModel):
    title: str
    duration: float
    quality: str
    background_type: Optional[str] = None
    background_value: Optional[str] = None
    filters_applied: List[str] = []
    video_data: str
    thumbnail: Optional[str] = None

class VideoMetadataResponse(BaseModel):
    id: str
    title: str
    duration: float
    quality: str
    background_type: Optional[str] = None
    background_value: Optional[str] = None
    filters_applied: List[str] = []
    created_at: datetime
    thumbnail: Optional[str] = None

class BackgroundImage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    image_data: str  # base64 encoded image
    is_predefined: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BackgroundImageCreate(BaseModel):
    name: str
    image_data: str
    is_predefined: bool = False

class UserSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default_user"
    is_premium: bool = False
    default_quality: str = "hd"
    max_duration: int = 1800  # 30 minutes in seconds
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserSettingsUpdate(BaseModel):
    is_premium: Optional[bool] = None
    default_quality: Optional[str] = None


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Video Recording API"}

# Video endpoints
@api_router.post("/videos", response_model=VideoMetadataResponse)
async def create_video(video: VideoMetadataCreate):
    """Save a recorded video"""
    video_dict = video.dict()
    video_obj = VideoMetadata(**video_dict)
    result = await db.videos.insert_one(video_obj.dict())
    
    # Return without video_data to reduce response size
    response_dict = video_obj.dict()
    response_dict.pop('video_data', None)
    return VideoMetadataResponse(**response_dict)

@api_router.get("/videos", response_model=List[VideoMetadataResponse])
async def get_videos():
    """Get all videos (without video data for performance)"""
    videos = await db.videos.find().sort("created_at", -1).to_list(100)
    response_videos = []
    for video in videos:
        video_dict = VideoMetadata(**video).dict()
        video_dict.pop('video_data', None)
        response_videos.append(VideoMetadataResponse(**video_dict))
    return response_videos

@api_router.get("/videos/{video_id}")
async def get_video(video_id: str):
    """Get a specific video with full data"""
    video = await db.videos.find_one({"id": video_id})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return VideoMetadata(**video)

@api_router.delete("/videos/{video_id}")
async def delete_video(video_id: str):
    """Delete a video"""
    result = await db.videos.delete_one({"id": video_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"message": "Video deleted successfully"}

# Background endpoints
@api_router.post("/backgrounds", response_model=BackgroundImage)
async def create_background(background: BackgroundImageCreate):
    """Upload a custom background"""
    background_dict = background.dict()
    background_obj = BackgroundImage(**background_dict)
    await db.backgrounds.insert_one(background_obj.dict())
    return background_obj

@api_router.get("/backgrounds", response_model=List[BackgroundImage])
async def get_backgrounds():
    """Get all backgrounds"""
    backgrounds = await db.backgrounds.find().to_list(100)
    return [BackgroundImage(**bg) for bg in backgrounds]

@api_router.delete("/backgrounds/{background_id}")
async def delete_background(background_id: str):
    """Delete a background"""
    result = await db.backgrounds.delete_one({"id": background_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Background not found")
    return {"message": "Background deleted successfully"}

# Settings endpoints
@api_router.get("/settings", response_model=UserSettings)
async def get_settings():
    """Get user settings"""
    settings = await db.settings.find_one({"user_id": "default_user"})
    if not settings:
        # Create default settings
        default_settings = UserSettings()
        await db.settings.insert_one(default_settings.dict())
        return default_settings
    return UserSettings(**settings)

@api_router.put("/settings", response_model=UserSettings)
async def update_settings(updates: UserSettingsUpdate):
    """Update user settings"""
    settings = await db.settings.find_one({"user_id": "default_user"})
    if not settings:
        settings = UserSettings().dict()
    
    update_dict = updates.dict(exclude_unset=True)
    update_dict['updated_at'] = datetime.utcnow()
    
    # Update max_duration based on premium status
    if 'is_premium' in update_dict:
        if update_dict['is_premium']:
            update_dict['max_duration'] = 7200  # 120 minutes
        else:
            update_dict['max_duration'] = 1800  # 30 minutes
    
    await db.settings.update_one(
        {"user_id": "default_user"},
        {"$set": update_dict},
        upsert=True
    )
    
    updated_settings = await db.settings.find_one({"user_id": "default_user"})
    return UserSettings(**updated_settings)

@api_router.post("/settings/premium")
async def upgrade_to_premium():
    """Upgrade to premium (mock paywall)"""
    settings = await db.settings.find_one({"user_id": "default_user"})
    if not settings:
        settings = UserSettings().dict()
    
    update_dict = {
        'is_premium': True,
        'max_duration': 7200,  # 120 minutes
        'updated_at': datetime.utcnow()
    }
    
    await db.settings.update_one(
        {"user_id": "default_user"},
        {"$set": update_dict},
        upsert=True
    )
    
    return {"message": "Upgraded to premium successfully", "max_duration": 7200}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
