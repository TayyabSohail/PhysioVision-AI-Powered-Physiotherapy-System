from pymongo import MongoClient
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, conint, confloat
from fastapi.middleware.cors import CORSMiddleware
from typing import Literal

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

client = None
db = None
collection_users = None
physical_attributes_collection = None


@app.on_event("startup")
def startup_db_client():
    global client, db, collection_users, physical_attributes_collection
    client = MongoClient(uri)
    db = client["PhysioVision"]
    collection_users =  db["Users"]   
    physical_attributes_collection = db["User_PhysicalAttributes"]
    print("Connected to the MongoDB database!")

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
            raise HTTPException(status_code=400, detail="A user already registed with this email. Try another one")

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


# Pydantic model for the field to be updated or created
class UserField(BaseModel):
    username: str
    field_name: str
    field_value: str

@app.post("/api/update-field")
async def update_field(user_field: UserField):
    try:
        # Find the user in the database
        existing_user = collection_users.find_one({"username": user_field.username})

        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found.")

        # Update the existing field or create it if it doesn't exist
        updated_user = collection_users.update_one(
            {"username": user_field.username},
            {"$set": {user_field.field_name: user_field.field_value}},
        )

        if updated_user.matched_count == 0:
            raise HTTPException(status_code=400, detail="Field update failed.")

        return {"message": f"Field '{user_field.field_name}' updated successfully for {user_field.username}."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

    # Pydantic Model for Validation
class HealthData(BaseModel):
    username : str
    sex: Literal["Female", "Male"]
    age: conint(ge =0)  # Ensures age is a non-negative integer
    height: confloat(ge=50, le=250)  # Ensures height is within range 
    hypertension: Literal["YES", "NO"]
    diabetes: Literal["YES", "NO"]
    bmi: confloat(ge=10, le=50) 
    pain_level: Literal["Acronic", "Acute"]
    pain_category: Literal["Almost Perfect", "Immovable", "On your feet"]


@app.post("/submit_physical_attributes")
async def add_health_data(data: HealthData):
    # Check if the user exists in the "users" collection
    user = collection_users.find_one({"username": data.username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Check if the health data already exists for the user in the "physical_attributes" collection
    existing_data = physical_attributes_collection.find_one({"username": data.username})
    if existing_data:
        return {"message": "Data already submitted, edit it from account settings"}
    # Convert the Pydantic data to a dictionary and link it with the username
    health_data = data.dict()  # Convert the Pydantic model to a dictionary
    # Insert health data inside the "physical_attributes" collection
    result= physical_attributes_collection.insert_one(health_data)
    return {"message": "Health data added successfully"}
