export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Starts the built-in email/password authentication flow. */
export const startLogin = () => {
  if (typeof window !== "undefined") window.location.href = "/sign-in";
};
