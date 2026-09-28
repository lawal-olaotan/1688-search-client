FROM public.ecr.aws/lambda/nodejs:22
LABEL com.amazonaws.lambda.feature.snapstart="Allow"

# Install Chrome dependencies + Chrome stable directly (no Puppeteer bundled Chromium)
RUN dnf install -y \
    alsa-lib atk at-spi2-atk cups-libs gtk3 libdrm libgbm \
    libXcomposite libXdamage libXfixes libXrandr libxkbcommon \
    nss pango xorg-x11-fonts-misc liberation-fonts wget \
    && wget -q -O /tmp/google-chrome.rpm \
        https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm \
    && rpm -i --nodeps /tmp/google-chrome.rpm \
    && rm /tmp/google-chrome.rpm \
    && dnf clean all

# Skip Puppeteer bundled Chromium — use system Chrome instead
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

COPY package*.json ${LAMBDA_TASK_ROOT}/
RUN npm ci --omit=dev

COPY dist/ ${LAMBDA_TASK_ROOT}/

CMD ["index.handler"]
