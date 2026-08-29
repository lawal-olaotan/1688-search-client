const parseDbUri = (connectionString: string) => {
  const values = Object.fromEntries(
    connectionString
      .split(';')
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.split('=');
        return [key.trim().toLowerCase(), rest.join('=').trim()];
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
            rejectUnauthorized: values['trust server certificate']?.toLowerCase() !== 'true',
          }
        : undefined,

    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
};

export const getDbConfig = async () => {
  const secretString = process.env.DB_URI;

  if (!secretString) {
    throw new Error(`Secret ${secretString} is empty.`);
  }

  const dbConfig = parseDbUri(secretString);

  if (!dbConfig.host || !dbConfig.database || !dbConfig.user || !dbConfig.password) {
    throw new Error(`Secret ${secretString} is missing required DB settings.`);
  }

  return dbConfig;
};
