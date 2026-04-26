from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import analyze, similarity

app = FastAPI(title="UrbanOracle API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://theurbanoracle.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router,    prefix="/api")
app.include_router(similarity.router, prefix="/api")


@app.get("/")
def root():
    return {"status": "ok", "message": "UrbanOracle API running"}
