FROM public.ecr.aws/lambda/nodejs:22

RUN dnf install -y \
    alsa-lib atk at-spi2-atk cups-libs gtk3 libdrm libgbm \
    libXcomposite libXdamage libXfixes libXrandr libxkbcommon \
    nss pango xorg-x11-fonts-misc liberation-fonts \
    && dnf clean all

ENV PUPPETEER_CACHE_DIR=/var/task/puppeteer-cache
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false

COPY package*.json ${LAMBDA_TASK_ROOT}/
RUN npm ci --omit=dev

COPY dist/ ${LAMBDA_TASK_ROOT}/

CMD ["index.handler"]
