# Run docker-compose build and start in detached mode, then show status
Set-Location -Path $PSScriptRoot
docker-compose up -d --build
docker-compose ps --all
