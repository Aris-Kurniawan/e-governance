# Backend Dockerfile (Python 3.14, slim)
FROM python:3.14-slim AS builder

WORKDIR /app

# Install system dependencies for torch & sentence-transformers
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download embedding model (paraphrase-multilingual-MiniLM-L12-v2) ke cache
# Sentence-transformers akan download otomatis di runtime, tapi jika tidak ada internet,
# model ini sudah ada di image.
RUN python -c "from sentence_transformers import SentenceTransformer; \
    SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2', cache_folder='/root/.cache')" || echo "Model download warning (skip)"

FROM python:3.14-slim

WORKDIR /app

# Runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.14/site-packages /usr/local/lib/python3.14/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy app source
COPY . .

# Non-root user untuk keamanan
RUN useradd -m -u 1001 appuser && chown -R appuser /app
USER appuser

# Health check untuk Docker (endpoint yang sudah ada: /api/health)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

EXPOSE 8000

# Jalankan uvicorn dengan konfigurasi produksi (workers=1 karena AI pipeline single-threaded)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
