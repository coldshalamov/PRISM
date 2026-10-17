FROM node:24-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=7860
WORKDIR /opt/prism
COPY backend/ ./backend/
COPY --from=frontend /build/frontend/dist/ ./backend/app/static/
COPY LICENSE NOTICE THIRD_PARTY_NOTICES.md ./
# Install after copying the frontend so its static assets enter the package.
RUN pip install --no-cache-dir ./backend \
    && useradd --create-home --uid 1000 prism
USER prism
EXPOSE 7860
CMD ["sh", "-c", "exec uvicorn app.hosted_demo:app --host 0.0.0.0 --port ${PORT:-7860} --workers 1 --no-access-log"]
