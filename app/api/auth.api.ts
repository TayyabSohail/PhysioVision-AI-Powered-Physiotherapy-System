import { POST } from "@/utils/api.service";

interface LoginResponse {
  success: boolean;
  user: {
    username: string;
  };
}

export const login = async ({
  username,
  password,
  notification,
}: {
  username: string;
  password: string;
  notification: any;
}) => {
  try {
    // Call the API to sign in
    const response = await POST<
      LoginResponse,
      { username: string; password: string }
    >("/api/signin", {
      username,
      password,
    });

    if (response?.success) {
      const { user } = response;

      if (typeof window !== "undefined") {
        localStorage.setItem("username", user.username);
      }

      window.location.href = "/dashboard"; // Redirect after login
    } else {
      notification?.error({
        message: "Incorrect username or password!",
      });
    }
  } catch (error) {
    notification?.error({
      message: "Login failed. Please try again.",
    });
  }
};
