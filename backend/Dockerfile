FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY server.py .
COPY mcp_server.py .
COPY main.py .
COPY oauth_server.py .

# Expose port
EXPOSE 8080

# Run FastAPI + MCP
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
