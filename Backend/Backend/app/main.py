from pymongo import MongoClient
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, conint, confloat
from fastapi.middleware.cors import CORSMiddleware
from typing import Literal
from chatbot import RAG
from chatbot import EmbeddingGenerator
import json
import re


# Initialize FastAPI app
app = FastAPI()


#initialize the RAG bot 
Ragbot = RAG()

#Load the documents 
Ragbot.load_documents()

# create the embedding generator (senetence transformers)
embedding_generator = EmbeddingGenerator()

# MongoDB URI for the database
uri = "mongodb+srv://abdullahmasood450:harry_potter123@cluster0.ys9yt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = None
db = None
collection_users = None
physical_attributes_collection = None
WeeklyPlan_collection = None


@app.on_event("startup")
def startup_db_client():
    global client, db, collection_users, physical_attributes_collection,WeeklyPlan_collection
    client = MongoClient(uri)
    db = client["PhysioVision"]
    collection_users =  db["Users"]   
    physical_attributes_collection = db["User_PhysicalAttributes"]
    WeeklyPlan_collection = db["User_WeeklyPlan"]
    print("Connected to the MongoDB database!")


        # Pydantic Model for Validation
class HealthData(BaseModel):
    username: str
    sex: Literal["Female", "Male"]
    age: conint(ge=0)  # Ensures age is a non-negative integer
    height: confloat(ge=50, le=250)  # Ensures height is within range 
    hypertension: Literal["Yes", "No"]  # Changed to match frontend
    diabetes: Literal["Yes", "No"]  # Changed to match frontend
    bmi: confloat(ge=10, le=50) 
    pain_level: Literal["Chronic", "Acute"]  # Fixed spelling from "Acronic" to "Chronic"
    pain_category: Literal["Almost Perfect", "Immovable", "On your feet"]

@app.post("/update-field")
async def add_health_data(data: HealthData):
    # Check if the user exists in the "users" collection
    user = collection_users.find_one({"username": data.username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Convert the Pydantic data to a dictionary
    health_data = data.dict()

    # Update or insert the health data in the "physical_attributes" collection
    result = physical_attributes_collection.update_one(
        {"username": data.username},  # Find document by username
        {"$set": health_data},  # Update fields with new data
        upsert=True  # Insert if not exists
    )

    return {"message": "Health data updated successfully"}

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

class ChatRequest(BaseModel):
    username: str
    user_input: str

class ChatResponse(BaseModel):
    response: str

def fetch_document_for_user(username: str):
    document = physical_attributes_collection.find_one({"username": username})  # Query MongoDB
    #print("Fetched document:", document)  # Debugging line
    if document:
        return document
    return "No document found for this user."

def update_weeklyplan(username, query_document):
    if query_document != "Empty":
        weekly_plan_match = re.search(r"Weekly_Plan:\s*(.*)Recovery_Weeks:", query_document, re.DOTALL)
        weekly_plan_text = weekly_plan_match.group(1).strip() if weekly_plan_match else ""

        # Extract full week details
        weeks = re.findall(r"(Week \d+: .*?)(?=Week \d+:|$)", weekly_plan_text, re.DOTALL)

        # Store each full week as a dictionary
        weekly_plans = [week.strip() for week in weeks]

        # Overwrite existing document for this user
        WeeklyPlan_collection.update_one(
            {"username": username}, 
            {"$set": {"username": username, "weekly_plans": weekly_plans}}, 
            upsert=True  # Creates a new document if username doesn't exist
        )

        print("Weekly plan updated successfully for:", username)
    else: 
        print("Empty document, no updates made.")


@app.post("/chats", response_model=ChatResponse)
async def chat_with_rag(request: ChatRequest):
    try:
        username = request.username
        user_input = request.user_input

        physical_attribute_document = fetch_document_for_user(username)
      

        if not physical_attribute_document:
            raise HTTPException(status_code=404, detail="No document found for this user.")
        

        #print("Query FROM Concatianted string "  , refined_query)

        query_document ,response = Ragbot.adaptive_retrieval(user_input, embedding_generator, physical_attribute_document)

        router = Ragbot.route_query(user_input)
        if router == "patient":
            update_weeklyplan(username,query_document)


        return ChatResponse(response= response) 

    except Exception as e:
        print(f"Error: {str(e)}")  # Debugging
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

@app.get("/weekly-plan/{username}")
async def get_weekly_plan(username: str):
    weekly_plan = WeeklyPlan_collection.find_one({"username": username})
    if not weekly_plan:
        raise HTTPException(status_code=404, detail="Weekly plan not found")
    
    # Convert ObjectId to string for JSON serialization
    weekly_plan["_id"] = str(weekly_plan["_id"])
    
    return weekly_plan

@app.get("/user/{username}")
async def get_user(username: str):
    # Try to find user in Users collection
    user = collection_users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert ObjectId to string for JSON serialization
    user["_id"] = str(user["_id"])
    
    # Get physical attributes if they exist
    physical_attributes = physical_attributes_collection.find_one({"username": username})
    if physical_attributes:
        # Convert ObjectId to string
        physical_attributes["_id"] = str(physical_attributes["_id"])
        # Merge physical attributes with user data
        user.update({k: v for k, v in physical_attributes.items() if k != "_id" and k != "username"})
    
    return user

@app.get("/vision-report/latest")
async def get_latest_vision_report():
    vision_reports_collection = db["vision_reports"]
    
    report = vision_reports_collection.find_one(
        {},  # No filter, get any document
    sort=[("timestamp", -1)]
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="No vision report found")
    
    report["_id"] = str(report["_id"])  # Serialize ObjectId
    
    return report