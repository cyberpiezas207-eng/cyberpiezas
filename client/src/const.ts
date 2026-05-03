export { COOKIE_NAME, ONE_YEAR_MS, CONTACT_INFO, getContactInfo } from "@shared/const";

// Local auth — login lives on our own domain, no external redirects
export const getLoginUrl = () => "/login";
