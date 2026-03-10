# Backend Dockerfile
# WHY: Docker packages our Python app with all its dependencies into a 
# "container" — like a sealed lunchbox. It runs identically on any machine.

FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Install system dependencies needed by some Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (Docker layer caching — if requirements don't change,
# this layer is reused and pip install is skipped on rebuild)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Create directories that will be used at runtime
RUN mkdir -p uploads faiss_store

# Expose port 8000
EXPOSE 8000

# Run the FastAPI app with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
