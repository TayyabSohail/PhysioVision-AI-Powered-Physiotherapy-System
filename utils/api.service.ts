import axios from "axios";

// Ensure localStorage access only on the client-side
const getAuthHeaders = () => {
  // Check if we're on the client-side (browser)
  if (typeof window !== "undefined") {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      return {
        Authorization: `Bearer ${accessToken}`,
      };
    }
  }
  return {};
};

// Create Axios client
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  // Initially set the headers with empty Authorization, it will be updated dynamically in the interceptor
  headers: getAuthHeaders(),
});

// Make sure headers are updated dynamically with the token during each request
apiClient.interceptors.request.use(
  (config) => {
    // Check again if we're on the client side before accessing localStorage
    if (typeof window !== "undefined") {
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper functions for making API requests
export const GET = async <T, U>(url: string, params?: U): Promise<T> => {
  try {
    const response = await apiClient.get<T>(url, { params });
    return response.data;
  } catch (error) {
    console.error("Error in GET request:", error);
    throw error;
  }
};

export const POST = async <T, U>(url: string, data: U): Promise<T> => {
  try {
    const response = await apiClient.post<T>(url, data);
    return response.data;
  } catch (error) {
    console.error("Error in POST request:", error);
    throw error;
  }
};

export const PUT = async <T, U>(url: string, data: U): Promise<T> => {
  try {
    const response = await apiClient.put<T>(url, data);
    return response.data;
  } catch (error) {
    console.error("Error in PUT request:", error);
    throw error;
  }
};

export const DELETE = async <T>(url: string): Promise<T> => {
  try {
    const response = await apiClient.delete<T>(url);
    return response.data;
  } catch (error) {
    console.error("Error in DELETE request:", error);
    throw error;
  }
};
