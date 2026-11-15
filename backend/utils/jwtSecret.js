const examplePlaceholder = 'replace-with-a-strong-random-secret';
const minimumSecretBytes = 32;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (
    typeof secret !== 'string' ||
    Buffer.byteLength(secret.trim(), 'utf8') < minimumSecretBytes ||
    secret.trim() === examplePlaceholder
  ) {
    return null;
  }
  return secret;
}

module.exports = getJwtSecret;
