const GRAPHQL_PATH =
  import.meta.env?.VITE_OTP_GRAPHQL_PATH || process.env?.VITE_OTP_GRAPHQL_PATH || '/otp/gtfs/v1';

const LOCAL_ENDPOINT =
  import.meta.env?.VITE_OTP_DEV_ENDPOINT || process.env?.VITE_OTP_DEV_ENDPOINT || `http://localhost:8080${GRAPHQL_PATH}`;

const NGROK_BASE =
  import.meta.env?.VITE_NGROK_HTTPS_URL || process.env?.VITE_NGROK_HTTPS_URL || '';

const REMOTE_ENDPOINT = NGROK_BASE ? `${NGROK_BASE}${GRAPHQL_PATH}` : LOCAL_ENDPOINT;

const MODE = import.meta.env?.MODE || process.env?.NODE_ENV || 'development';

export const OTP_GRAPHQL_PATH = GRAPHQL_PATH;
export const OTP_DEV_ENDPOINT = LOCAL_ENDPOINT;
export const OTP_REMOTE_ENDPOINT = REMOTE_ENDPOINT;
export const OTP_ENDPOINT = MODE === 'production' ? REMOTE_ENDPOINT : LOCAL_ENDPOINT;

export default OTP_ENDPOINT;
