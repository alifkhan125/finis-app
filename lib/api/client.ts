import { create, type InternalAxiosRequestConfig, AxiosError } from "axios";
import { API_BASE_URL } from "@/lib/config";
import { getCurrentAccessToken } from "@/lib/auth-token";
import { useNetworkStore } from "@/store/network.store";

export const api = create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getCurrentAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    if (typeof config.headers.delete === "function") {
      config.headers.delete("Content-Type");
      config.headers.delete("content-type");
    } else {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    // If response arrived successfully, connection is healthy
    const { isConnected, setOffline } = useNetworkStore.getState();
    if (!isConnected) {
      setOffline(false);
    }
    return response;
  },
  (error: AxiosError<{ message?: string }>) => {
    const isNetworkError =
      error.code === "ERR_NETWORK" ||
      error.message === "Network Error" ||
      (!error.response && error.code !== "ECONNABORTED");

    if (isNetworkError) {
      error.message = "Mobile internet is not working. Please check your mobile data or Wi-Fi and try again.";
      useNetworkStore.getState().setOffline(true);
    } else if (error.code === "ECONNABORTED" || error.message?.toLowerCase().includes("timeout")) {
      error.message = "Request timed out. Please check your network connection.";
      void useNetworkStore.getState().checkConnection();
    } else if (error.response?.status === 502 || error.response?.status === 503) {
      error.message = "Server is temporarily unavailable. Please try again in a moment.";
    } else if (error.response?.data?.message) {
      error.message = error.response.data.message;
    }
    return Promise.reject(error);
  }
);
