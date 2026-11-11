FROM python:3.11-slim

# Install system dependencies ringan untuk build C extension (UMAP/HDBSCAN)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements yang sudah bersih dari PyTorch/Sentence-Transformers
COPY requirements.txt .

# Install dependencies Python (ringan, ~150MB)
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code backend
COPY . .

# Abaikan data riset besar jika ada
ENV PYTHONPATH=/app
ENV PORT=8000

EXPOSE 8000

# Jalankan Uvicorn server production
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
