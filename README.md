# Deployment Notes

The production deployment lives at [https://testtinggg-peach.vercel.app/](https://testtinggg-peach.vercel.app/).

## Required environment variables

Set the following variable for both the Production and Preview environments in Vercel:

- `VITE_OTP_URL=https://2b36aa1affb0.ngrok-free.app/otp` (replace with your active tunnel URL when it changes).

This ensures that the `buildOtpUrl` helper emits an absolute GraphQL endpoint so the `/otp/transmodel/v3` requests reach the tunnel instead of defaulting to a relative path.

## Deployment steps

1. Update the `VITE_OTP_URL` value above if the ngrok tunnel URL has rotated.
2. Add or update the variable in Vercel's Production and Preview Environment Variables.
3. Redeploy the project in Vercel so the new configuration is picked up.
4. After the deployment finishes, open the site in the browser, monitor the network requests in the developer tools, and confirm that `/otp/transmodel/v3` calls target the ngrok domain and return itineraries successfully.

Following these steps prevents 404 responses caused by missing or outdated OTP endpoint configuration.
