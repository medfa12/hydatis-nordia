let employeeId: number | null = null;

export function setDemoIdentity(id: number | null) {
  employeeId = id;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body !== undefined && typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  headers.delete("X-Employee-Id");
  if (employeeId !== null) {
    headers.set("X-Employee-Id", String(employeeId));
  }

  const response = await fetch(`/api${path}`, { ...options, headers });
  const text = await response.text();
  let data: unknown;

  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    throw new Error(
      response.ok
        ? "The server returned an invalid JSON response."
        : `Request failed (${response.status}). Please try again.`,
    );
  }

  if (!response.ok) {
    const message = typeof data === "object" && data !== null && "error" in data
      && typeof data.error === "string" ? data.error : `Request failed (${response.status}).`;
    throw new Error(message);
  }

  return data as T;
}
