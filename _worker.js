const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers
    }
  });

const limits = {
  name: 100,
  company: 120,
  email: 160,
  phone: 40,
  employees: 30,
  service: 80,
  message: 2000,
  website: 120,
  turnstileResponse: 4096
};

const allowedServices = new Set([
  "Managed IT Services",
  "Microsoft 365 or Cloud Services",
  "Cybersecurity",
  "Business Voice or VoIP",
  "Network or Managed Wi-Fi",
  "IP Security Camera Systems",
  "Fixed Wireless or Connectivity",
  "Workstation or Infrastructure Support",
  "Technology Consulting",
  "Other"
]);

const sanitize = (value, maxLength) =>
  String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const normalizedLength = (value) =>
  String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getClientIp = (request) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return request.headers.get("cf-connecting-ip") || forwardedFor?.split(",")[0]?.trim() || "";
};

const verifyTurnstile = async ({ secret, token, remoteIp }) => {
  if (!token) {
    return { success: false, errorCodes: ["missing-input-response"] };
  }

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);
  if (remoteIp) {
    formData.append("remoteip", remoteIp);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(formData)
  });

  if (!response.ok) {
    return { success: false, errorCodes: ["siteverify-unavailable"] };
  }

  const result = await response.json();

  if (result.success === true && result.action && result.action !== "turnstile-spin-v2") {
    return { success: false, errorCodes: ["invalid-action"] };
  }

  return {
    success: result.success === true,
    errorCodes: result["error-codes"] || []
  };
};

const parseRequestBody = async (request) => {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }

  return {};
};

const validatePayload = (payload) => {
  const data = {
    name: sanitize(payload.name, limits.name),
    company: sanitize(payload.company, limits.company),
    email: sanitize(payload.email, limits.email).toLowerCase(),
    phone: sanitize(payload.phone, limits.phone),
    employees: sanitize(payload.employees, limits.employees),
    service: sanitize(payload.service, limits.service),
    message: sanitize(payload.message, limits.message),
    website: sanitize(payload.website, limits.website),
    turnstileResponse: sanitize(payload["cf-turnstile-response"], limits.turnstileResponse),
    privacy: payload.privacy === true || payload.privacy === "true" || payload.privacy === "on"
  };

  const errors = {};

  if (data.website) {
    errors.website = "Invalid submission.";
  }

  if (!data.name) errors.name = "Name is required.";
  if (!data.company) errors.company = "Company or organization is required.";
  if (!data.email) errors.email = "Business email is required.";
  if (data.email && !isEmail(data.email)) errors.email = "Enter a valid business email address.";
  if (!data.phone) errors.phone = "Phone is required.";
  if (!data.service) errors.service = "Service needed is required.";
  if (data.service && !allowedServices.has(data.service)) errors.service = "Select a valid service.";
  if (!data.message) errors.message = "Message is required.";
  if (!data.privacy) errors.privacy = "Privacy acknowledgment is required.";

  Object.entries(limits).forEach(([field, maxLength]) => {
    const payloadField = field === "turnstileResponse" ? "cf-turnstile-response" : field;
    if (field !== "website" && normalizedLength(payload[payloadField]) > maxLength) {
      errors[field] = `${field} must be ${maxLength} characters or fewer.`;
    }
  });

  return {
    data,
    errors,
    valid: Object.keys(errors).length === 0
  };
};

const createEmailHtml = (data) => `
  <h1>New Two River Communications website inquiry</h1>
  <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
  <p><strong>Company or organization:</strong> ${escapeHtml(data.company)}</p>
  <p><strong>Business email:</strong> ${escapeHtml(data.email)}</p>
  <p><strong>Phone:</strong> ${escapeHtml(data.phone)}</p>
  <p><strong>Number of employees:</strong> ${escapeHtml(data.employees || "Not provided")}</p>
  <p><strong>Service needed:</strong> ${escapeHtml(data.service)}</p>
  <p><strong>Message:</strong></p>
  <p>${escapeHtml(data.message).replace(/\n/g, "<br>")}</p>
`;

const getGraphAccessToken = async ({ tenantId, clientId, clientSecret }) => {
  const tokenResponse = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default"
    })
  });

  const tokenResult = await tokenResponse.json().catch(() => ({}));

  if (!tokenResponse.ok || !tokenResult.access_token) {
    throw new Error(`Microsoft Graph token request failed with status ${tokenResponse.status}`);
  }

  return tokenResult.access_token;
};

const sendGraphEmail = async ({ env, data }) => {
  const accessToken = await getGraphAccessToken({
    tenantId: env.MS_TENANT_ID,
    clientId: env.MS_CLIENT_ID,
    clientSecret: env.MS_CLIENT_SECRET
  });

  const fromEmail = env.MS_FROM_EMAIL;
  const toRecipients = env.CONTACT_TO_EMAIL.split(",")
    .map((email) => email.trim())
    .filter(Boolean)
    .map((email) => ({ emailAddress: { address: email } }));

  const emailResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromEmail)}/sendMail`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      message: {
        subject: `Website inquiry from ${data.company}`,
        body: {
          contentType: "HTML",
          content: createEmailHtml(data)
        },
        toRecipients,
        replyTo: [
          {
            emailAddress: {
              address: data.email,
              name: data.name
            }
          }
        ]
      },
      saveToSentItems: true
    })
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text().catch(() => "");
    throw new Error(`Microsoft Graph sendMail failed with status ${emailResponse.status}: ${errorText.slice(0, 300)}`);
  }
};

const microsoftGraphVariableNames = ["MS_TENANT_ID", "MS_CLIENT_ID", "MS_CLIENT_SECRET", "MS_FROM_EMAIL", "CONTACT_TO_EMAIL"];

const hasEnvValue = (env, name) => String(env[name] || "").trim().length > 0;

const getMissingMicrosoftGraphVariables = (env) =>
  microsoftGraphVariableNames.filter((name) => !hasEnvValue(env, name));

const microsoftGraphIsConfigured = (env) =>
  getMissingMicrosoftGraphVariables(env).length === 0;

const getTurnstileSecret = (env) =>
  env.TURNSTILE_SECRET || env.TURNSTILE_SECRET_KEY || env.CF_TURNSTILE_SECRET || env.CLOUDFLARE_TURNSTILE_SECRET;

const handleConfigCheck = (env) =>
  json({
    contactRoute: "ok",
    turnstileConfigured: Boolean(getTurnstileSecret(env)),
    microsoftGraphConfigured: microsoftGraphIsConfigured(env),
    missingMicrosoftGraphVariables: getMissingMicrosoftGraphVariables(env)
  });

async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "GET") {
    return handleConfigCheck(env);
  }

  if (request.method !== "POST") {
    return json({ success: false, message: "Method not allowed." }, 405, { allow: "POST" });
  }

  let payload;
  try {
    payload = await parseRequestBody(request);
  } catch (error) {
    return json({ success: false, message: "Request body could not be read." }, 400);
  }

  const validation = validatePayload(payload);
  if (!validation.valid) {
    return json(
      {
        success: false,
        message: "Please correct the highlighted fields.",
        errors: validation.errors
      },
      400
    );
  }

  const turnstileSecret = getTurnstileSecret(env);

  if (!turnstileSecret) {
    return json({ success: false, message: "The contact form anti-spam check is not configured yet." }, 503);
  }

  let turnstileResult;
  try {
    turnstileResult = await verifyTurnstile({
      secret: turnstileSecret,
      token: validation.data.turnstileResponse,
      remoteIp: getClientIp(request)
    });
  } catch (error) {
    console.error("Turnstile verification failed", error);
    return json({ success: false, message: "The anti-spam check could not be verified right now. Please try again." }, 502);
  }

  if (!turnstileResult.success) {
    return json({ success: false, message: "Please complete the anti-spam verification and try again." }, 400);
  }

  const missingMicrosoftGraphVariables = getMissingMicrosoftGraphVariables(env);

  if (missingMicrosoftGraphVariables.length > 0) {
    return json(
      {
        success: false,
        message: "The contact form email service is not configured yet.",
        missingConfiguration: missingMicrosoftGraphVariables
      },
      503
    );
  }

  try {
    await sendGraphEmail({ env, data: validation.data });
  } catch (error) {
    console.error("Contact form email failed", error);
    return json(
      {
        success: false,
        message: "The message could not be sent right now. Please try again or contact Two River Communications directly."
      },
      502
    );
  }

  return json({
    success: true,
    message: "Message received. Two River Communications will reach out soon."
  });
}


export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact" || url.pathname === "/api/contact/") {
      return onRequest({ request, env, context });
    }

    return env.ASSETS.fetch(request);
  }
};
