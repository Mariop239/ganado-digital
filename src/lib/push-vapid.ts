// VAPID public key — safe to expose to the client (web-push standard).
// Private key vive como secreto del servidor para la Edge Function `send-push`.
export const VAPID_PUBLIC_KEY =
  "BA859K4gv8SyQpXqh494c6JdqlyaZxCZ5pS3HWyiJTwOIN5SUsOFYsPD7MUaMsUg4zPRYJFibeJNI37zit1ImWM";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}