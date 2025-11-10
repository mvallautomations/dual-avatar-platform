from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
import uuid

from ..database import get_db
from ..models import Template

router = APIRouter()


class CreateTemplateRequest(BaseModel):
    name: str
    description: str = ""
    config: dict


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: str
    config: dict
    version: str
    active: bool
    created_at: str

    class Config:
        from_attributes = True


@router.post("/", response_model=TemplateResponse)
async def create_template(
    request: CreateTemplateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new template"""
    template = Template(
        name=request.name,
        description=request.description,
        config=request.config,
        version="1.0.0",
        active=True,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)

    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        description=template.description or "",
        config=template.config,
        version=template.version,
        active=bool(template.active),
        created_at=template.created_at.isoformat(),
    )


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get template details"""
    result = await db.execute(
        select(Template).where(Template.id == uuid.UUID(template_id))
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        description=template.description or "",
        config=template.config,
        version=template.version,
        active=bool(template.active),
        created_at=template.created_at.isoformat(),
    )


@router.get("/", response_model=List[TemplateResponse])
async def list_templates(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List all templates"""
    result = await db.execute(
        select(Template)
        .where(Template.active == 1)
        .order_by(Template.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    templates = result.scalars().all()

    return [
        TemplateResponse(
            id=str(template.id),
            name=template.name,
            description=template.description or "",
            config=template.config,
            version=template.version,
            active=bool(template.active),
            created_at=template.created_at.isoformat(),
        )
        for template in templates
    ]
