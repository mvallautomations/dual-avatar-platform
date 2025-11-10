from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
import uuid

from ..database import get_db
from ..models import Batch, BatchJob, JobStatus

router = APIRouter()


class CreateBatchRequest(BaseModel):
    name: str
    description: str = ""
    template_id: str | None = None
    jobs: List[dict]


class BatchResponse(BaseModel):
    id: str
    name: str
    description: str
    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    status: str
    created_at: str

    class Config:
        from_attributes = True


@router.post("/", response_model=BatchResponse)
async def create_batch(
    request: CreateBatchRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new batch of jobs"""
    batch_id = uuid.uuid4()

    # Create batch
    batch = Batch(
        id=batch_id,
        name=request.name,
        description=request.description,
        template_id=uuid.UUID(request.template_id) if request.template_id else None,
        total_jobs=len(request.jobs),
        status=JobStatus.PENDING,
    )
    db.add(batch)

    # Create jobs
    for job_data in request.jobs:
        job = BatchJob(
            batch_id=batch_id,
            template_id=uuid.UUID(request.template_id) if request.template_id else None,
            config=job_data.get("config", {}),
            input_data=job_data.get("input_data", {}),
            status=JobStatus.PENDING,
        )
        db.add(job)

    await db.commit()
    await db.refresh(batch)

    return BatchResponse(
        id=str(batch.id),
        name=batch.name,
        description=batch.description or "",
        total_jobs=batch.total_jobs,
        completed_jobs=batch.completed_jobs,
        failed_jobs=batch.failed_jobs,
        status=batch.status.value,
        created_at=batch.created_at.isoformat(),
    )


@router.get("/{batch_id}", response_model=BatchResponse)
async def get_batch(
    batch_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get batch details"""
    result = await db.execute(
        select(Batch).where(Batch.id == uuid.UUID(batch_id))
    )
    batch = result.scalar_one_or_none()

    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    return BatchResponse(
        id=str(batch.id),
        name=batch.name,
        description=batch.description or "",
        total_jobs=batch.total_jobs,
        completed_jobs=batch.completed_jobs,
        failed_jobs=batch.failed_jobs,
        status=batch.status.value,
        created_at=batch.created_at.isoformat(),
    )


@router.get("/", response_model=List[BatchResponse])
async def list_batches(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List all batches"""
    result = await db.execute(
        select(Batch).order_by(Batch.created_at.desc()).offset(skip).limit(limit)
    )
    batches = result.scalars().all()

    return [
        BatchResponse(
            id=str(batch.id),
            name=batch.name,
            description=batch.description or "",
            total_jobs=batch.total_jobs,
            completed_jobs=batch.completed_jobs,
            failed_jobs=batch.failed_jobs,
            status=batch.status.value,
            created_at=batch.created_at.isoformat(),
        )
        for batch in batches
    ]
