// Minimal fetch wrapper for the new backend (chatbot, and future auth/products/orders wiring).
// Uses VITE_API_BASE_URL if set, otherwise assumes the backend runs on localhost:5000 in dev.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export async function apiFetch(path, options = {}) {
  let accessToken = null;
  try {
    accessToken = localStorage.getItem("styron_access_token");
  } catch {
    // storage unavailable — proceed unauthenticated
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response, leave data as null
  }

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
