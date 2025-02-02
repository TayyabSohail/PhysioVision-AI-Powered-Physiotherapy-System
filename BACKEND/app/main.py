from pymongo import MongoClient
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI app
app = FastAPI()

uri = "mongodb+srv://abdullahmasood450:harry_potter123@cluster0.ys9yt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# Middleware for CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace '*' with your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = None
db = None
collection_users = None


@app.on_event("startup")
def startup_db_client():
    global client, db, collection_users
    client = MongoClient(uri)
    db = client["PhysioVision"]
    collection_users =  db["Users"]   
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

