import { POST } from "@/utils/api.service"; // Assuming POST method is available for sending data

// Define the type for the form data
export interface UserFormData {
  name: string;
  username: string;
  email: string;
  sex: string;
  age: number;
  height: number;
  hypertension: string;
  diabetes: string;
  bmi: number;
  pain_level: string;
  pain_category: string;
  mobility: string; // Added to match frontend form
}

// Define the API endpoint URL to match backend
const API_URL = "/update-field";

// Function to send data to backend to update or create a user field
export const updateUserData = async (data: UserFormData): Promise<string> => {
  try {
    // Transform data to match backend expectations
    const backendData = {
      username: data.username,
      sex: data.sex,
      age: data.age,
      height: data.height,
      hypertension: data.hypertension,
      diabetes: data.diabetes,
      bmi: data.bmi,
      pain_level: data.pain_level,
      pain_category: data.mobility, // Map mobility to pain_category as per backend schema
    };

    const response = await POST<{ message: string }, typeof backendData>(
      API_URL,
      backendData
    );
    return response?.message || "User data updated successfully!";
  } catch (error) {
    console.error("Error updating user data:", error);
    throw new Error("Failed to update user data.");
  }
};
