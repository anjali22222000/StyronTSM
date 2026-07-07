import { API_BASE_URL } from "./apiClient";

/** Like apiFetch, but attaches the admin access token instead of the customer one. */
export async function adminApiFetch(path, options = {}) {
  let accessToken = null;
  try {
    accessToken = localStorage.getItem("styron_admin_access_token");
  } catch {
    // storage unavailable
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
    // non-JSON response
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

/** Like adminApiFetch, but sends FormData (multipart) for file uploads — no Content-Type
 * header is set manually so the browser can add the correct multipart boundary. */
export async function adminApiUpload(path, formData, method = "POST") {
  let accessToken = null;
  try {
    accessToken = localStorage.getItem("styron_admin_access_token");
  } catch {
    // storage unavailable
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: formData,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response
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
