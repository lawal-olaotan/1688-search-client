import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'eu-west-2' });

let cachedMongoUri: string | null = null;

export const getMongoUri = async (): Promise<string> => {
  if (cachedMongoUri) {
    return cachedMongoUri;
  }

  const secretName = process.env.AWS_SECRET_NAME;
  if (!secretName) {
    throw new Error('AWS_SECRET_NAME environment variable is not set');
  }

  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName }),
  );

  if (!response.SecretString) {
    throw new Error(
      'Secret string not found in AWS Secrets Manager response',
    );
  }

  const secret = JSON.parse(response.SecretString);
  const mongoUri = secret.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI not found in AWS Secrets Manager secret');
  }

  cachedMongoUri = mongoUri;
  return mongoUri;
};
