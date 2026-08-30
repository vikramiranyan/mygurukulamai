from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import Date, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Parent(Base):
    __tablename__ = "parents"

    id: Mapped[int] = mapped_column(primary_key=True)
    google_sub: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    display_name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    children: Mapped[list["Child"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan", passive_deletes=True
    )


class Child(Base):
    __tablename__ = "children"

    id: Mapped[int] = mapped_column(primary_key=True)
    parent_id: Mapped[int] = mapped_column(ForeignKey("parents.id", ondelete="CASCADE"), index=True)
    # Public identifier: generated only by the server and globally unique.
    child_id: Mapped[str] = mapped_column(String(40), default=lambda: f"CHD-{uuid4().hex[:12].upper()}", unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(50), nullable=True)
    grade: Mapped[str | None] = mapped_column(String(50), nullable=True)
    section: Mapped[str | None] = mapped_column(String(50), nullable=True)
    school_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    school_board: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    parent: Mapped[Parent] = relationship(back_populates="children")
