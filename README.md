# 1688 Image Search Function

A Lambda function that performs reverse image search on 1688.com using Puppeteer and returns supplier details. Optionally translates results to English via AWS Translate.

---

## Prerequisites

- [Node.js 22+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- AWS credentials with `translate:TranslateText` permission (only needed when `useEnglish: true`)

---

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Build TypeScript

```bash
npm run build
```

This compiles the source into the `dist/` directory.

---

## Running Locally with Docker

The function runs as a Lambda container image. The AWS Lambda base image includes the Runtime Interface Emulator (RIE), which allows you to invoke it locally over HTTP.

### 1. Build the Docker image

```bash
docker build -t 1688-image-search:local .
```

On Apple Silicon (M1/M2/M3), add `--platform`:

```bash
docker build --platform linux/amd64 -t 1688-image-search:local .
```

### 2. Run the container

```bash
docker run --rm -p 9000:8080 --shm-size=512m 1688-image-search:local
```

> `--shm-size=512m` is required — Chromium/Puppeteer uses `/dev/shm` and will crash silently without it.

If you need AWS Translate (`useEnglish: true`), pass credentials as environment variables:

```bash
docker run --rm -p 9000:8080 --shm-size=512m \
  -e AWS_ACCESS_KEY_ID=your_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret \
  -e AWS_REGION=eu-west-2 \
  1688-image-search:local
```

### 3. Invoke the function

In a separate terminal:

```bash
curl -X POST "http://localhost:9000/2015-03-31/functions/function/invocations" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://your-product-image-url.jpg"}'
```

To receive results translated to English:

```bash
curl -X POST "http://localhost:9000/2015-03-31/functions/function/invocations" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://your-product-image-url.jpg", "useEnglish": true}'
```

---

## Event Payload

| Field        | Type      | Required | Description                                               |
|--------------|-----------|----------|-----------------------------------------------------------|
| `imageUrl`   | `string`  | ✅        | Publicly accessible URL of the product image              |
| `useEnglish` | `boolean` | ❌        | Translate `productTitle` and `supplierName` to English    |

---

## Response

Returns an array of supplier details:

```json
[
  {
    "universalId": "uuid",
    "productTitle": "Product name",
    "productUrl": "https://detail.1688.com/offer/xxx.html",
    "productImage": "https://...",
    "productPriceRange": { "min": 12.5 },
    "yearsActive": "5",
    "supplierName": "Supplier name",
    "supplierMoq": "More than 10 pieces",
    "supplierUrl": "https://detail.1688.com/offer/xxx.html",
    "platform": "1688"
  }
]
```

---

## Debugging

### View logs
All logs (including cookie diagnostics and errors) stream directly in the terminal where `docker run` is running.

### Shell into the container
To inspect installed packages or verify Chromium is available:

```bash
docker run --rm -it --entrypoint /bin/bash 1688-image-search:local
```

### Check for missing shared libraries
Inside the container shell:

```bash
ldd $(find / -name "chrome" 2>/dev/null | head -1) | grep "not found"
```

Any `not found` entries indicate missing system libraries that will cause Puppeteer to fail silently.

### Chromium on Lambda
- `--disable-gpu`, `--no-sandbox`, `--no-zygote`, `--single-process` are required for stable Chrome in Lambda
- `PUPPETEER_CACHE_DIR` must point to a path baked into the image at build time (`/var/task/puppeteer-cache`)
- Set `PUPPETEER_EXECUTABLE_PATH` in Lambda environment variables if Chrome is not being found automatically

---

## Deployment

Deployment is automated via GitHub Actions on push to `main`. The workflow:

1. Installs dependencies and compiles TypeScript
2. Assumes an AWS IAM role via OIDC (no long-lived credentials stored)
3. Builds and pushes the Docker image to Amazon ECR
4. Updates the Lambda function with the new image and waits for it to be active

See `.github/workflows/deploy-lambda.yml` for full details.

### Required GitHub Secrets

| Secret          | Description                                  |
|-----------------|----------------------------------------------|
| `AWS_ROLE_ARN`  | ARN of the IAM role to assume via OIDC       |
| `AWS_REGION`    | AWS region where ECR and Lambda are deployed |

### Required IAM permissions on the deployment role

- `ecr:GetAuthorizationToken`
- `ecr:BatchCheckLayerAvailability`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`, `ecr:PutImage`
- `lambda:UpdateFunctionCode`, `lambda:GetFunction`, `lambda:GetFunctionConfiguration`

### Required IAM permissions on the Lambda execution role

- `translate:TranslateText` (for English translation feature)
- `secretsmanager:GetSecretValue` (for database connection secret lookup)
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` (via `AWSLambdaBasicExecutionRole`)

### Required environment variables on the Lambda function

| Variable             | Description                                                        |
|----------------------|--------------------------------------------------------------------|
| `AWS_SECRET_NAME`    | Name of the AWS Secrets Manager secret containing `MONGO_URI`      |
| `PROXY_USERNAME`     | Username for the 1688 proxy authentication                           |
| `PROXY_PASSWORD`     | Password for the 1688 proxy authentication                           |

### Database

Supplier search results are automatically saved to a MongoDB collection named `SuppliersList` in the `robotdorm` database. The MongoDB connection string is retrieved from AWS Secrets Manager as the `MONGO_URI` key within the secret.
