import OTP_ENDPOINT from './otpConfig';

async function parseError(response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json.errors) && json.errors.length) {
      const message = json.errors.map((error) => error.message).join('; ');
      return new Error(message || 'GraphQL error');
    }
    return new Error(`HTTP ${response.status}: ${text}`);
  } catch (error) {
    return new Error(`HTTP ${response.status}: ${text}`);
  }
}

export async function callOtp(query, variables = {}) {
  const response = await fetch(OTP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    // OTP's GraphQL endpoints return 405 on GET, so POST is required.
    throw await parseError(response);
  }

  const payload = await response.json();
  if (Array.isArray(payload.errors) && payload.errors.length) {
    throw new Error(payload.errors.map((error) => error.message).join('; '));
  }

  return payload.data;
}

export default callOtp;
