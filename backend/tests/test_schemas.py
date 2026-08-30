from datetime import date

from app.schemas import ChildCreate, ChildUpdate


def test_child_create_accepts_final_fields_only():
    child = ChildCreate(
        name="Aarav",
        date_of_birth=date(2016, 4, 12),
        gender="Male",
        grade="5",
        section="A",
        school_name="Example School",
        school_board="CBSE",
    )
    assert child.name == "Aarav"
    assert not hasattr(child, "photo")
    assert not hasattr(child, "roll_number")
    assert not hasattr(child, "academic_year")
    assert not hasattr(child, "medium_of_instruction")
    assert not hasattr(child, "parent_relationship")


def test_child_id_is_not_client_supplied():
    payload = ChildCreate(name="Aarav")
    assert "child_id" not in payload.model_dump()


def test_child_update_does_not_allow_child_id_change():
    payload = ChildUpdate(name="Aarav Updated")
    assert "child_id" not in payload.model_dump()
