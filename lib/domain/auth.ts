const AUTH_DOMAIN = "auth.hassep.local";

export type LoginIdentifierInput = {
  organizationCode: string;
  username: string;
};

export type OwnerRegistrationInput = {
  restaurantName: string;
  organizationCode: string;
  ownerEmail: string;
  ownerUsername?: string | null;
};

export function normalizeIdentifier(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

export function buildSyntheticEmail(username: string, organizationCode: string) {
  const normalizedUsername = normalizeIdentifier(username);
  const normalizedOrganizationCode = normalizeIdentifier(organizationCode);

  return `${normalizedUsername}__${normalizedOrganizationCode}@${AUTH_DOMAIN}`;
}

export function deriveUsernameFromEmail(email: string) {
  const localPart = email.trim().toLowerCase().split("@")[0] ?? "owner";
  const normalized = normalizeIdentifier(localPart).slice(0, 32);

  return normalized.length >= 3 ? normalized : "owner";
}

export function buildLoginIdentifier(input: LoginIdentifierInput) {
  const organizationCode = normalizeIdentifier(input.organizationCode);
  const username = normalizeIdentifier(input.username);

  return {
    organizationCode,
    username,
    email: buildSyntheticEmail(username, organizationCode),
  };
}

export function normalizeOwnerRegistrationInput(input: OwnerRegistrationInput) {
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const ownerUsernameSource =
    typeof input.ownerUsername === "string" && input.ownerUsername.trim().length > 0
      ? input.ownerUsername
      : deriveUsernameFromEmail(ownerEmail);
  const loginIdentifier = buildLoginIdentifier({
    organizationCode: input.organizationCode,
    username: ownerUsernameSource,
  });

  return {
    restaurantName: input.restaurantName.trim(),
    organizationCode: loginIdentifier.organizationCode,
    ownerEmail,
    ownerUsername: loginIdentifier.username,
    syntheticEmail: loginIdentifier.email,
  };
}
