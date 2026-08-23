"""
Application entry point. Run with:

    uvicorn app.main:app --reload

`create_app()` is a factory (rather than a bare module-level `app`) so
tests can construct fresh instances with overridden dependencies without
import-order headaches.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import admin, ai, auth, complaints, feedback, location, worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    # Warm up the text classifier at startup so the first request isn't
    # slowed down by training the TF-IDF/NB pipeline.
    try:
        from app.services.classification import reload_classifier

        reload_classifier(settings.classification_model_path)
    except FileNotFoundError:
        # Training data may be intentionally absent in some environments
        # (e.g. minimal test containers); classification calls will raise
        # a clear error later instead of failing app startup.
        pass

    yield
    # No teardown needed: Supabase client and classifier are in-process
    # caches with no external connections to close.


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix=settings.api_v1_prefix)
    app.include_router(complaints.router, prefix=settings.api_v1_prefix)
    app.include_router(ai.router, prefix=settings.api_v1_prefix)
    app.include_router(location.router, prefix=settings.api_v1_prefix)
    app.include_router(admin.router, prefix=settings.api_v1_prefix)
    app.include_router(worker.router, prefix=settings.api_v1_prefix)
    app.include_router(feedback.router, prefix=settings.api_v1_prefix)

    @app.get("/health", tags=["health"])
    def health_check():
        return {"status": "ok", "app": settings.app_name, "env": settings.env}

    return app


app = create_app()
