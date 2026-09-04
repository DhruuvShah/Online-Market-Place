type ValidationError = { msg?: string; path?: string };

type ApiErrorBody = {
  message?: string;
  errors?: ValidationError[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (!isRecord(error)) return fallback;

  if ("status" in error && error.status === "FETCH_ERROR") {
    return "Could not reach the server. It may still be waking up.";
  }

  const data = "data" in error ? (error.data as ApiErrorBody) : undefined;
  if (!data) return fallback;

  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors[0].msg ?? fallback;
  }

  return data.message ?? fallback;
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (!isRecord(error) || !("data" in error)) return {};

  const data = error.data as ApiErrorBody;
  if (!Array.isArray(data?.errors)) return {};

  return data.errors.reduce<Record<string, string>>((acc, item) => {
    if (item.path && item.msg && !acc[item.path]) acc[item.path] = item.msg;
    return acc;
  }, {});
}
