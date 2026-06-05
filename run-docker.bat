@echo off
REM Run docker-compose build and start in detached mode, then show status
cd /d "%~dp0"
docker-compose up -d --build
docker-compose ps --all
pause
