import {
  SecretsManager,
} from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManager({
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
});

const parseDbUri = (connectionString:string) => {
  const values = Object.fromEntries(
    connectionString
      .split(';')
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.split('=');
        return [
          key.trim().toLowerCase(),
          rest.join('=').trim(),
        ];
      }),
  );

  return {
    host: values.host,
    database: values.database,
    user: values.username,
    password: values.password,

    ssl:
      values['ssl mode']?.toLowerCase() === 'require'
        ? {
          rejectUnauthorized:
            values['trust server certificate']?.toLowerCase() !== 'true',
        }
        : undefined,

    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
};

export const getDbConfig = async () => {
  const secretName = process.env.DB_URI_SECRET_NAME || 'DB_URI';

  const secret = await secretsManager.getSecretValue({ SecretId: secretName });
  const secretString = secret.SecretString || '';

  if (!secretString) {
    throw new Error(`Secret ${secretName} is empty.`);
  }

  const dbConfig = parseDbUri(secretString);

  if (!dbConfig.host || !dbConfig.database || !dbConfig.user || !dbConfig.password) {
    throw new Error(`Secret ${secretName} is missing required DB settings.`);
  }

  return dbConfig;
};
