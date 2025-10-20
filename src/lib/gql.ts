const OTP_GTFS_ENDPOINT = "https://91e22e78a863.ngrok-free.app/otp/gtfs/v1";

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

export async function gqlFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(OTP_GTFS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GraphQL request failed with ${response.status}: ${text}`);
  }

  const payload: GraphQLResponse<T> = await response.json();

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  if (!payload.data) {
    throw new Error("GraphQL response did not include data");
  }

  return payload.data;
}

export { OTP_GTFS_ENDPOINT };
