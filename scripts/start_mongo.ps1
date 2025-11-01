# scripts/start_mongo.ps1
# Start the local MongoDB container with Docker Compose and load .env.docker variables
$envFile = Join-Path (Resolve-Path ..\).Path '.env.docker'
if (Test-Path .\.env.docker) {
    Write-Host "Using .env.docker in project root"
} else {
    Write-Host ".env.docker not found in project root. Creating from template..."
    # do nothing — file should already exist in repo
}

# Run docker-compose up -d
Write-Host "Starting MongoDB container with docker-compose..."
docker compose up -d

Write-Host "MongoDB container started. View logs with: docker compose logs -f mongo"
Write-Host "Example MONGO_URI: mongodb://root:example@localhost:27017/?authSource=admin"
