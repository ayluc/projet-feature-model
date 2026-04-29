# Backend
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Frontend
cd frontend && npm run dev
# Docker
docker-compose up --build 
pour avoir en arriere plan : docker-compose up -d  
docker-compose down