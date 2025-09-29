@echo off
echo Starting CVD Detection Backend...
cd /d "%~dp0backend"
call cvd_backend_env\Scripts\activate.bat
echo Backend environment activated
echo Starting FastAPI server on http://localhost:8000
python main.py
pause