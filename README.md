# PhysioVision: AI Powered Physiotherapy System

## 🎯 Meet PhysioVision – Your AI Physiotherapy Assistant
We’ve built an intelligent, real-time AI-powered physiotherapy assistant that mimics the role of a personal physiotherapist — guiding, correcting, and motivating you through every stretch, rep, and recovery.

## 💻 Tech Stack:
Developed using Next.js & MERN stack, our full-stack web app delivers smooth real-time performance and interaction.

## 🧠 Generative AI Chatbot (RAG-based):
Your virtual coach offers:

* Personalized therapy & diet plans
* Contextual, adaptive support
* Real-time bilingual guidance in Urdu & English via audio and visual cues

## 📹 Computer Vision Module + Generative AI:
With just your device camera, PhysioVision:

* Tracks joint movement
* Calculates angles for precision (like knees during squats/lunges)
* Gives instant corrective feedback — just like a real therapist

### Backed by up to 94% accuracy

## 🌐 Bilingual. Intelligent. Real-Time.
PhysioVision isn’t just an app — it’s your AI physiotherapist, helping you recover smarter, faster, and safer.

# User Interface and Working
## Landing Page
https://github.com/user-attachments/assets/cefce571-ed6c-448c-bc1d-8d76b639a029

## SignUp / SignIn / Forgot Password
https://github.com/user-attachments/assets/2420debe-f6bc-47a8-86d2-38ae03be5384



## Recommendation System
https://github.com/user-attachments/assets/26a7f9aa-36be-4841-ab76-efeb5a698950



## Computer Vision Model
### 1. Leg Raises 

https://github.com/user-attachments/assets/4bb059af-f916-4c81-af94-709af0bc35b5


### 2. Lunges

https://github.com/user-attachments/assets/bc35a97a-2498-49dd-b6f5-05034a9fa7fc



### 3. Squats

https://github.com/user-attachments/assets/959479b5-4d65-41a7-a4ec-a0675ec4de9e


### 4. Warrior Pose

https://github.com/user-attachments/assets/52766d32-4591-4575-a242-49d52bbdd829





## Key Features:
### Dynamic Recommendations: 
Offers personalized exercise and nutrition plans using a chatbot powered by Adaptive Retrieval-Augmented Generation (RAG).

### Live Posture Correction: 
Utilizes Computer Vision and Deep Learning models to monitor and guide posture with audio-visual feedback.

### Progress Tracking: 
Tracks users' performance and progress over time for consistent improvement.

### Bilingual Support: 
Provides a seamless user experience in multiple languages, making physiotherapy accessible to a diverse audience.

### Modern Front-End Stack: 
Built with React, Vite, and Tailwind CSS for a responsive and user-friendly interface.

## Tech Stack:
### Frontend: React, Vite, Tailwind CSS
### Backend: Adaptive RAG Chatbot for intelligent interaction
### Computer Vision: Deep Learning models for posture analysis and correction
### Tools: Audio-visual feedback for real-time guidance

# Purpose:
This platform aims to provide effective physiotherapy solutions for users of different linguistic backgrounds, ensuring accessibility and inclusivity while leveraging cutting-edge AI and computer vision technologies.

Check out the code and details in this repository to learn more about how the system works!



_____________________________________________________________________________________________________

# HOW TO RUN ON LOCAL HOST

## FRONT END
* npm install 
* pnpm dev

## CHATBOT BACKEND
(Update file path in chatbot.py)

* cd Backend
* cd Backend
* python -m venv myenv ( IF ALREADY CREATED THEN DONT RUN THIS )
* myenv\Scripts\activate
* pip install -r requirements.txt
* cd app
* uvicorn main:app --reload

## Vision Backend (Update model paths)
* cd Backend_Vision
* py -3.10 -m venv backend_env_310 (IF ALREADY CREATED THEN DON'T)
* backend_env_310\Scripts\activate
* pip install -r requirements.txt
* python (file_name).py

_____________________________________________________________________________________________________
# COMPLETE DEMO

https://github.com/user-attachments/assets/151388e1-b676-4925-b3af-e60a923c4a18


_____________________________________________________________________________________________________
# PROJECT POSTER
![PhysioVision_Banner](https://github.com/user-attachments/assets/9ecedbee-da63-4481-b94c-a2591fd09d98)






