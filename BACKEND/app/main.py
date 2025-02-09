from pymongo import MongoClient
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI app
app = FastAPI()

# MongoDB URI for the database
uri = "mongodb+srv://abdullahmasood450:harry_potter123@cluster0.ys9yt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# Middleware for CORS (to allow requests from frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB client initialization
client = MongoClient(uri)
db = client["PhysioVision"]  # Use your actual database name here
collection_users = db["Users"]  # Your collection for users

# Pydantic model for sign-in request data
class UserSignIn(BaseModel):
    username: str
    password: str

@app.post("/api/signin")
async def sign_in(user: UserSignIn):
    # Find the user in the database
    existing_user = collection_users.find_one({"username": user.username})

    if not existing_user:
        raise HTTPException(status_code=400, detail="Username does not exist.")

    # Compare passwords directly (no hashing)
    if user.password != existing_user["password"]:
        raise HTTPException(status_code=400, detail="Incorrect password.")

    # Return success response
    return {
        "message": "Login successful",
        "success": True,
        "user": {
            "username": existing_user["username"]
        }
    }



@app.on_event("startup")
def startup_db_client():
    global client, db, collection_users
    client = MongoClient(uri)
    db = client["PhysioVision"]
    collection_users =  db["Users"]   
    print("Connected to the MongoDB database!")


# Pydantic model
class UserSignUp(BaseModel):
    name: str
    username: str
    email: str
    password: str

# User sign-up route
@app.post("/api/signup")
async def sign_up(user: UserSignUp):
    try:
        # Check if username or email already exists
        existing_user = collection_users.find_one({"username": user.username})
        existing_email = collection_users.find_one({"email": user.email})

        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists. Try another one.")
        
        if existing_email:
            raise HTTPException(status_code=400, detail="Email is already used. Try another one.")

        # Convert Pydantic model to dictionary
        user_data = user.dict()
        result = collection_users.insert_one(user_data)  # Insert the document
        return {"message": "User registered successfully!"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
 


@app.get("/api/user/{username}")
async def get_user_details(username: str):
    # Fetch user details from 'Users' collection
    user = collection_users.find_one(
        {"username": username}, 
        {"_id": 0, "password": 0}  # Exclude sensitive fields
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Fetch user physical attributes from 'User_PhysicalAttributes' collection
    collection_physical_attributes = db["User_PhysicalAttributes"]
    physical_attributes = collection_physical_attributes.find_one(
        {"username": username}, 
        {"_id": 0}  # Exclude MongoDB's `_id`
    )

    # Merge both datasets
    user_data = {
        **user,  # Include user details
        **(physical_attributes or {})  # Include attributes if found
    }

    return {"success": True, "user": user_data}
