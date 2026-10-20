from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import engine, Base, SessionLocal
from app.db.init_db import init_db
from app.api import routes_finance, routes_ingestion, routes_analytics, routes_governance, routes_ai

app = FastAPI(
    title="AI Finance Controller System",
    description="Production-grade AI Financial Controllership Platform with Deterministic Analytics, Immutable Audit Logging, Dual-Control Governance, and RAG Chat.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(routes_finance.router)
app.include_router(routes_ingestion.router)
app.include_router(routes_analytics.router)
app.include_router(routes_governance.router)
app.include_router(routes_ai.router)

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "system": "AI Finance Controller",
        "status": "online",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
