from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
import uuid

from ..database import get_db
from ..models import BatchJob, JobStatus

router = APIRouter()


class JobResponse(BaseModel):
    id: str
    batch_id: str
    status: str
    progress: int
    output_url: str | None
    error_message: str | None
    created_at: str

    class Config:
        from_attributes = True


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get job details"""
    result = await db.execute(
        select(BatchJob).where(BatchJob.id == uuid.UUID(job_id))
    )
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobResponse(
        id=str(job.id),
        batch_id=str(job.batch_id),
        status=job.status.value,
        progress=job.progress,
        output_url=job.output_url,
        error_message=job.error_message,
        created_at=job.created_at.isoformat(),
    )


@router.get("/batch/{batch_id}", response_model=List[JobResponse])
async def list_batch_jobs(
    batch_id: str,
    db: AsyncSession = Depends(get_db)
):
    """List all jobs in a batch"""
    result = await db.execute(
        select(BatchJob)
        .where(BatchJob.batch_id == uuid.UUID(batch_id))
        .order_by(BatchJob.created_at.asc())
    )
    jobs = result.scalars().all()

    return [
        JobResponse(
            id=str(job.id),
            batch_id=str(job.batch_id),
            status=job.status.value,
            progress=job.progress,
            output_url=job.output_url,
            error_message=job.error_message,
            created_at=job.created_at.isoformat(),
        )
        for job in jobs
    ]
