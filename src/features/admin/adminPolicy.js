export function hasAdminClaim(claims) {
  return Boolean(claims && claims.admin === true);
}
