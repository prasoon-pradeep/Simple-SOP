#!/usr/bin/env python3
"""
Seed the SOP Builder demo database with realistic British industrial data.
Wipes existing content and populates with clean demo SOPs, tools, items, steps, and images.
"""

import sqlite3
import uuid
import os
import shutil
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, date
from pathlib import Path

DB_PATH = Path.home() / ".local/share/com.pp.sop-builder/sop-builder.db"
IMAGES_DIR = Path.home() / ".local/share/com.pp.sop-builder/images"

NOW = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

# ---------------------------------------------------------------------------
# Image sources — Wikimedia Commons public domain / CC images
# ---------------------------------------------------------------------------

# Lorem Picsum — free, seeded, consistent photo service. Seed controls which photo.
# Seeds chosen to land on images that look industrial/mechanical.
IMAGE_SOURCES = {
    "hydraulic_press":     "https://picsum.photos/seed/hydraulic42/800/600.jpg",
    "pressure_gauge":      "https://picsum.photos/seed/gauge17/800/600.jpg",
    "torque_wrench":       "https://picsum.photos/seed/wrench88/800/600.jpg",
    "spanners":            "https://picsum.photos/seed/spanner33/800/600.jpg",
    "drum_barrel":         "https://picsum.photos/seed/barrel91/800/600.jpg",
    "chemical_label":      "https://picsum.photos/seed/chemical55/800/600.jpg",
    "cnc_machine":         "https://picsum.photos/seed/cnc74/800/600.jpg",
    "cutting_insert":      "https://picsum.photos/seed/insert22/800/600.jpg",
    "fire_extinguisher":   "https://picsum.photos/seed/fireext66/800/600.jpg",
    "safety_helmet":       "https://picsum.photos/seed/helmet11/800/600.jpg",
    "inspection_checklist":"https://picsum.photos/seed/inspect99/800/600.jpg",
    "forklift":            "https://picsum.photos/seed/forklift48/800/600.jpg",
}


def make_placeholder_png(label: str, colour: tuple) -> bytes:
    """Generate a simple coloured PNG with label text as fallback."""
    from PIL import Image, ImageDraw, ImageFont
    img = Image.new("RGB", (640, 480), colour)
    draw = ImageDraw.Draw(img)
    draw.rectangle([20, 20, 620, 460], outline=(255, 255, 255), width=4)
    draw.text((320, 240), label, fill=(255, 255, 255), anchor="mm")
    import io
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


PLACEHOLDER_COLOURS = {
    "hydraulic": (60, 80, 100),
    "pressure":  (80, 60, 60),
    "torque":    (60, 80, 60),
    "spanner":   (70, 70, 50),
    "drum":      (80, 70, 40),
    "chemical":  (100, 50, 50),
    "cnc":       (50, 60, 80),
    "cutting":   (70, 60, 70),
    "fire":      (100, 40, 40),
    "safety":    (40, 70, 40),
    "inspection":(60, 60, 80),
    "forklift":  (70, 60, 50),
}

def download_image(key: str, url: str) -> tuple[bytes, str]:
    """Download image from URL. Falls back to placeholder on failure."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        print(f"  ✓ {key}")
        return data, "jpg"
    except Exception as e:
        print(f"  ✗ {key}: {e} — using placeholder")
        colour = next((v for k, v in PLACEHOLDER_COLOURS.items() if k in key), (60, 60, 60))
        return make_placeholder_png(key.replace("_", " ").title(), colour), "png"


def save_image_to_disk(data: bytes, ext: str) -> str:
    """Write original + annotated files under a fresh UUID dir. Returns UUID."""
    img_uuid = str(uuid.uuid4())
    img_dir = IMAGES_DIR / img_uuid
    img_dir.mkdir(parents=True, exist_ok=True)
    (img_dir / f"original.{ext}").write_bytes(data)
    # annotated.png is a copy for demo purposes
    if ext == "png":
        (img_dir / "annotated.png").write_bytes(data)
    else:
        # Convert to PNG via Pillow
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(data)).convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            (img_dir / "annotated.png").write_bytes(buf.getvalue())
        except Exception:
            (img_dir / "annotated.png").write_bytes(data)
    return img_uuid


# ---------------------------------------------------------------------------
# Download all images up front
# ---------------------------------------------------------------------------

print("Downloading images...")
images: dict[str, str] = {}  # key -> uuid
for key, url in IMAGE_SOURCES.items():
    data, ext = download_image(key, url)
    images[key] = save_image_to_disk(data, ext)

print(f"\n{len(images)} images saved.\n")


# ---------------------------------------------------------------------------
# Wipe & recreate DB content
# ---------------------------------------------------------------------------

print("Seeding database...")
conn = sqlite3.connect(str(DB_PATH))
conn.execute("PRAGMA foreign_keys=OFF;")

for table in ["step_items", "step_tools", "step_images", "steps",
              "items", "tools", "definitions", "revisions", "sops", "app_config"]:
    conn.execute(f"DELETE FROM {table};")
conn.commit()
conn.execute("PRAGMA foreign_keys=ON;")


def uid() -> str:
    return str(uuid.uuid4())


def insert_sop(c, **kw) -> str:
    row_id = uid()
    c.execute("""
        INSERT INTO sops (id, sop_id, version, title, project_tag, department,
            document_owner, created_by, created_date, active_date, next_review_date,
            approval_status, regulatory_ref, distribution_list, related_documents,
            purpose, scope, safety_notes, training_required, training_details,
            created_at, updated_at, is_deleted, deleted_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,NULL)
    """, (
        row_id, kw["sop_id"], kw.get("version", 1), kw["title"],
        kw.get("project_tag"), kw.get("department"), kw.get("document_owner"),
        kw.get("created_by"), kw.get("created_date"), kw.get("active_date"),
        kw.get("next_review_date"), kw.get("approval_status"),
        kw.get("regulatory_ref"), kw.get("distribution_list"),
        kw.get("related_documents"), kw.get("purpose"), kw.get("scope"),
        kw.get("safety_notes"), kw.get("training_required", 0),
        kw.get("training_details"), NOW, NOW,
    ))
    return row_id


def insert_revision(c, sop_id, **kw):
    c.execute("""
        INSERT INTO revisions (id, sop_id, version, revision_notes, revised_by,
            revision_date, approval_status, approved_by, approval_date)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (uid(), sop_id, kw["version"], kw["notes"], kw.get("revised_by"),
          kw["date"], kw.get("approval_status"), kw.get("approved_by"), kw.get("approval_date")))


def insert_definition(c, sop_id, term, meaning, order_n):
    c.execute("INSERT INTO definitions (id, sop_id, term, meaning, sort_order) VALUES (?,?,?,?,?)",
              (uid(), sop_id, term, meaning, order_n))


def insert_tool(c, sop_id, **kw) -> str:
    tool_id = uid()
    c.execute("""
        INSERT INTO tools (id, sop_id, name, type, model_part_no, specification,
            image_uuid, calibration_required, calibration_due_date)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (tool_id, sop_id, kw["name"], kw.get("type"), kw.get("model_part_no"),
          kw.get("specification"), kw.get("image_uuid"),
          kw.get("calibration_required", 0), kw.get("calibration_due_date")))
    return tool_id


def insert_item(c, sop_id, **kw) -> str:
    item_id = uid()
    c.execute("""
        INSERT INTO items (id, sop_id, name, part_no, description, image_uuid, unit)
        VALUES (?,?,?,?,?,?,?)
    """, (item_id, sop_id, kw["name"], kw.get("part_no"), kw.get("description"),
          kw.get("image_uuid"), kw.get("unit")))
    return item_id


def insert_step(c, sop_id, step_number, sort_order, action, notes=None, expected_output=None) -> str:
    step_id = uid()
    c.execute("""
        INSERT INTO steps (id, sop_id, step_number, action, notes, expected_output, sort_order)
        VALUES (?,?,?,?,?,?,?)
    """, (step_id, sop_id, step_number, action, notes, expected_output, sort_order))
    return step_id


def attach_step_image(c, step_id, image_uuid, order_n=0):
    c.execute("INSERT INTO step_images (id, step_id, image_uuid, sort_order) VALUES (?,?,?,?)",
              (uid(), step_id, image_uuid, order_n))


def attach_step_tool(c, step_id, tool_id):
    c.execute("INSERT INTO step_tools (id, step_id, tool_id) VALUES (?,?,?)",
              (uid(), step_id, tool_id))


def attach_step_item(c, step_id, item_id, qty=None, unit=None):
    c.execute("INSERT INTO step_items (id, step_id, item_id, quantity, unit) VALUES (?,?,?,?,?)",
              (uid(), step_id, item_id, qty, unit))


cur = conn.cursor()

# ===========================================================================
# SOP 1 — Hydraulic Press Pre-Operation Inspection
# ===========================================================================

s1 = insert_sop(cur,
    sop_id="SOP-2025-HP4X7R",
    title="Hydraulic Press Pre-Operation Inspection",
    version=3,
    project_tag="MAINT",
    department="Maintenance Engineering",
    document_owner="William Ashford",
    created_by="James Whitfield",
    created_date="2024-03-10",
    active_date="2024-04-01",
    next_review_date="2025-04-01",
    approval_status="Approved",
    regulatory_ref="PSSR 2000; BS EN ISO 4413:2010",
    distribution_list="Maintenance Engineering, Production Supervisors, H&S Manager",
    related_documents="SOP-2025-FE4X2K; Risk Assessment RA-2024-031",
    purpose=(
        "To ensure the hydraulic press is safe and fully operational before each production shift. "
        "This procedure identifies potential faults before they result in equipment failure or injury."
    ),
    scope=(
        "Applies to all 50-tonne and 100-tonne hydraulic presses on the shop floor. "
        "This inspection must be completed by an authorised press operator or maintenance technician "
        "at the start of every shift and following any unplanned shutdown."
    ),
    safety_notes=(
        "Isolate and lock out/tag out (LOTO) the press before inspecting hydraulic lines or seals. "
        "Never operate the press with a hydraulic leak present. "
        "Wear appropriate PPE at all times: safety boots, gloves, and eye protection. "
        "If pressure readings are outside tolerance, do not operate — raise a fault report immediately."
    ),
    training_required=1,
    training_details="Operators must hold a valid hydraulic press certification (internal course HP-101) and have completed H&S induction.",
)

insert_revision(cur, s1, version=1, notes="Initial release following risk assessment update RA-2024-031.",
    revised_by="James Whitfield", date="2024-03-10",
    approval_status="Approved", approved_by="Margaret Thornton", approval_date="2024-03-18")
insert_revision(cur, s1, version=2, notes="Amended pressure tolerance range following engineering review. Updated LOTO section.",
    revised_by="William Ashford", date="2024-09-05",
    approval_status="Approved", approved_by="Margaret Thornton", approval_date="2024-09-12")
insert_revision(cur, s1, version=3, notes="Added regulatory reference to PSSR 2000. Minor wording clarifications.",
    revised_by="William Ashford", date="2025-01-20",
    approval_status="Approved", approved_by="Oliver Hargreaves", approval_date="2025-01-27")

insert_definition(cur, s1, "LOTO", "Lock Out / Tag Out — energy isolation procedure before maintenance work", 0)
insert_definition(cur, s1, "PSI", "Pounds per Square Inch — unit of pressure measurement", 1)
insert_definition(cur, s1, "Ram", "The moving hydraulic cylinder component that applies downward force", 2)
insert_definition(cur, s1, "Relief Valve", "Pressure-limiting valve that prevents system overpressure", 3)

t1_gauge = insert_tool(cur, s1, name="Digital Pressure Gauge", type="Measuring",
    model_part_no="WIKA PG-232-S", specification="0–600 bar, ±0.5% accuracy, calibrated quarterly",
    image_uuid=images["pressure_gauge"], calibration_required=1, calibration_due_date="2025-07-01")
t1_torch = insert_tool(cur, s1, name="Inspection Torch", type="Inspection",
    model_part_no="Peli 7060", specification="LED, explosion-proof rating Ex II 2G",
    image_uuid=None, calibration_required=0)
t1_wrench = insert_tool(cur, s1, name="Torque Wrench 1/2\" Drive", type="Hand Tool",
    model_part_no="Norbar Pro-Tronic 100", specification="20–100 Nm, calibrated annually",
    image_uuid=images["torque_wrench"], calibration_required=1, calibration_due_date="2025-12-01")

i1_fluid = insert_item(cur, s1, name="Hydraulic Oil HV46", part_no="HYD-OIL-HV46-20L",
    description="ISO VG 46 anti-wear hydraulic oil, 20 litre drum", unit="litre",
    image_uuid=images["drum_barrel"])
i1_rags = insert_item(cur, s1, name="Workshop Cleaning Rags", part_no="RAG-LINT-FREE",
    description="Lint-free cotton rags for surface cleaning", unit="pack")
i1_tag = insert_item(cur, s1, name="LOTO Danger Tag", part_no="LOTO-TAG-RED",
    description="Red danger tag — Do Not Operate", unit="each")

# Steps
st = insert_step(cur, s1, 1, 0,
    action="Collect inspection kit and PPE",
    notes="Retrieve the hydraulic press inspection kit from the maintenance store (shelf B3). Kit must contain: digital pressure gauge, torch, torque wrench, and inspection checklist form HP-CHK-01.",
    expected_output="All required items present and in calibration date.")
attach_step_tool(cur, st, t1_gauge)
attach_step_tool(cur, st, t1_torch)
attach_step_tool(cur, st, t1_wrench)
attach_step_image(cur, st, images["pressure_gauge"])

st = insert_step(cur, s1, 2, 1,
    action="Isolate and apply LOTO",
    notes="Turn the main isolator to the OFF position. Apply your personal padlock and attach a LOTO Danger Tag clearly stating your name and date. Confirm zero energy state by attempting to actuate the press.",
    expected_output="Press does not actuate. Ram is stationary.")
attach_step_item(cur, st, i1_tag, qty=1, unit="each")
attach_step_image(cur, st, images["safety_helmet"])

st = insert_step(cur, s1, 3, 2,
    action="Inspect hydraulic lines and fittings for leaks",
    notes="Using the inspection torch, visually check all visible hydraulic hoses and fittings. Look for oil seepage, cracking, or chafing on hose outer sheath. Wipe suspect areas clean with a rag and recheck after 2 minutes.",
    expected_output="No active leaks or seepage observed.")
attach_step_tool(cur, st, t1_torch)
attach_step_item(cur, st, i1_rags)
attach_step_image(cur, st, images["hydraulic_press"])

st = insert_step(cur, s1, 4, 3,
    action="Check hydraulic fluid level",
    notes="Locate the sight glass on the reservoir. Fluid level must be between the MIN and MAX markers. If below MIN, top up with HV46 hydraulic oil. Record quantity added on form HP-CHK-01.",
    expected_output="Fluid level between MIN and MAX markers.")
attach_step_item(cur, st, i1_fluid)
attach_step_image(cur, st, images["pressure_gauge"])

st = insert_step(cur, s1, 5, 4,
    action="Remove LOTO, restore power and test relief valve pressure",
    notes="Remove padlock and LOTO tag. Restore power at the main isolator. With no tooling loaded, cycle the press and observe pressure gauge at full extension. System relief valve should activate between 180–220 bar. If outside this range, shut down immediately and notify a maintenance engineer.",
    expected_output="Relief valve activates at 180–220 bar. No abnormal noise or vibration.")
attach_step_tool(cur, st, t1_gauge)
attach_step_image(cur, st, images["pressure_gauge"])

st = insert_step(cur, s1, 6, 5,
    action="Complete and sign inspection checklist",
    notes="Fill in all fields on form HP-CHK-01. Sign and date. File original in the press logbook folder (located on press control cabinet). Scan and upload to the shared maintenance drive.",
    expected_output="Completed, signed checklist filed. Press cleared for production use.")

# ===========================================================================
# SOP 2 — Chemical Drum Decanting Procedure
# ===========================================================================

s2 = insert_sop(cur,
    sop_id="SOP-2025-CD9M2P",
    title="Chemical Drum Decanting and Storage Procedure",
    version=2,
    project_tag="WAREHOUSE",
    department="Warehouse & Logistics",
    document_owner="Margaret Thornton",
    created_by="Oliver Hargreaves",
    created_date="2024-06-01",
    active_date="2024-06-15",
    next_review_date="2025-06-15",
    approval_status="Approved",
    regulatory_ref="COSHH 2002; ADR 2023; HSE INDG136",
    distribution_list="Warehouse Team, Chemical Store Supervisor, H&S Manager",
    related_documents="COSHH Assessment CA-2024-012; Emergency Spill Response Plan",
    purpose=(
        "To establish a safe and compliant method for decanting liquid chemicals from bulk drums "
        "into smaller working containers, and for correct labelling and storage thereafter."
    ),
    scope=(
        "Applies to all chemicals stored in the chemical store (Building 3, Zone C). "
        "This procedure covers solvents, acids, alkalis, and hydraulic fluids in drums of 20 litres or greater."
    ),
    safety_notes=(
        "Read the relevant COSHH assessment and Safety Data Sheet (SDS) before commencing. "
        "Decanting must only be carried out in a ventilated area or under an LEV extraction hood. "
        "Wear chemical-resistant gloves, splash goggles, and a chemical-resistant apron. "
        "Never use a naked flame or generate sparks near flammable solvents. "
        "Have a spill kit and fire extinguisher within reach at all times."
    ),
    training_required=1,
    training_details="Staff must hold COSHH awareness certification and have completed chemical handling induction (Course CHM-01).",
)

insert_revision(cur, s2, version=1, notes="Initial release aligned with updated COSHH assessments.",
    revised_by="Oliver Hargreaves", date="2024-06-01",
    approval_status="Approved", approved_by="Margaret Thornton", approval_date="2024-06-10")
insert_revision(cur, s2, version=2, notes="Updated PPE requirements. Added LEV reference. Revised spill response steps.",
    revised_by="Margaret Thornton", date="2025-02-12",
    approval_status="Approved", approved_by="Charlotte Fairweather", approval_date="2025-02-18")

insert_definition(cur, s2, "COSHH", "Control of Substances Hazardous to Health — UK health and safety regulation", 0)
insert_definition(cur, s2, "SDS", "Safety Data Sheet — document detailing hazards, handling, and emergency measures for a substance", 1)
insert_definition(cur, s2, "LEV", "Local Exhaust Ventilation — system used to capture and remove hazardous airborne substances at source", 2)
insert_definition(cur, s2, "ADR", "European Agreement concerning the International Carriage of Dangerous Goods by Road", 3)
insert_definition(cur, s2, "Decanting", "Transferring liquid from a bulk container into a smaller working container", 4)

t2_trolley = insert_tool(cur, s2, name="Drum Trolley", type="Materials Handling",
    model_part_no="Denios DT-250", specification="Capacity 250 kg, non-sparking castors",
    image_uuid=None, calibration_required=0)
t2_pump = insert_tool(cur, s2, name="Manual Drum Pump", part_no="DP-SS-300", type="Transfer Equipment",
    model_part_no="Graco FD1", specification="Stainless steel, chemical-resistant seals, suitable for acids and solvents",
    image_uuid=None, calibration_required=0)
t2_funnel = insert_tool(cur, s2, name="Anti-Static Funnel", type="Transfer Equipment",
    model_part_no="Justrite 08202", specification="Polypropylene, 3-litre, earthing cable attached",
    image_uuid=None, calibration_required=0)

i2_drum = insert_item(cur, s2, name="Chemical Drum (subject material)", part_no="VARIABLE",
    description="Bulk chemical drum — refer to COSHH assessment for specific substance", unit="drum",
    image_uuid=images["drum_barrel"])
i2_label = insert_item(cur, s2, name="Secondary Container Label", part_no="LBL-CHEM-GHS",
    description="GHS-compliant label for transferred substance including hazard pictograms", unit="each",
    image_uuid=images["chemical_label"])
i2_absorbent = insert_item(cur, s2, name="Chemical Absorbent Pads", part_no="ABS-CHEM-100",
    description="Universal absorbent pads, chemical resistant, 40×50 cm", unit="pack",
    image_uuid=None)
i2_gloves = insert_item(cur, s2, name="Chemical-Resistant Gloves (nitrile)", part_no="PPE-GLV-NITR-L",
    description="Nitrile, 0.38 mm thickness, EN374 certified", unit="pair",
    image_uuid=None)

st = insert_step(cur, s2, 1, 0,
    action="Retrieve and review COSHH assessment and SDS",
    notes="Before handling, locate the SDS for the specific chemical from the COSHH folder in the chemical store office. Confirm the correct PPE requirements and any specific handling precautions. Ensure LEV extraction is switched ON.",
    expected_output="SDS reviewed. LEV extraction running. Correct PPE selected.")
attach_step_image(cur, st, images["chemical_label"])

st = insert_step(cur, s2, 2, 1,
    action="Don PPE and prepare the decanting area",
    notes="Put on chemical-resistant gloves, splash goggles, and apron before touching the drum. Position the drum on the trolley. Place absorbent pads beneath the decanting point. Ensure the working container is correctly earthed if handling flammable material.",
    expected_output="PPE worn. Drum on trolley. Absorbent pads in place.")
attach_step_tool(cur, st, t2_trolley)
attach_step_item(cur, st, i2_drum)
attach_step_item(cur, st, i2_absorbent)
attach_step_item(cur, st, i2_gloves)
attach_step_image(cur, st, images["drum_barrel"])

st = insert_step(cur, s2, 3, 2,
    action="Attach drum pump and transfer chemical to secondary container",
    notes="Insert the drum pump into the bung opening. Pump the required quantity into the secondary container using smooth, even strokes. Do not overfill — leave 10% headspace. Use the anti-static funnel if transferring by gravity.",
    expected_output="Required quantity transferred. No spillage. Container not overfilled.")
attach_step_tool(cur, st, t2_pump)
attach_step_tool(cur, st, t2_funnel)

st = insert_step(cur, s2, 4, 3,
    action="Label secondary container",
    notes="Immediately apply a completed GHS-compliant label to the secondary container. Label must include: substance name, hazard pictograms, supplier name, H/P statements, and quantity. Never leave a decanted container unlabelled.",
    expected_output="Secondary container fully labelled before leaving work area.")
attach_step_item(cur, st, i2_label)
attach_step_image(cur, st, images["chemical_label"])

st = insert_step(cur, s2, 5, 4,
    action="Reseal bulk drum and return to storage",
    notes="Replace and tighten the drum bung. Remove the drum pump. Wipe down drum exterior. Return the drum to its designated storage bay using the trolley. Check bund level and ensure no residual leaks.",
    expected_output="Drum resealed and returned to storage. Bund clear of spillage.")
attach_step_tool(cur, st, t2_trolley)
attach_step_item(cur, st, i2_absorbent)

st = insert_step(cur, s2, 6, 5,
    action="Remove PPE, dispose of contaminated materials, and record transfer",
    notes="Remove PPE carefully to avoid self-contamination. Dispose of used absorbent pads in the hazardous waste bin. Wash hands thoroughly. Record quantity transferred in the chemical usage log.",
    expected_output="PPE removed and disposed of. Usage log updated.")

# ===========================================================================
# SOP 3 — CNC Lathe Indexable Insert Change
# ===========================================================================

s3 = insert_sop(cur,
    sop_id="SOP-2025-CL3W8N",
    title="CNC Lathe Indexable Insert Change",
    version=1,
    project_tag="PRODUCTION",
    department="Production Engineering",
    document_owner="Oliver Hargreaves",
    created_by="Charlotte Fairweather",
    created_date="2025-01-08",
    active_date=None,
    next_review_date="2026-01-08",
    approval_status="Under Review",
    regulatory_ref="PUWER 1998; BS EN ISO 23125:2010",
    distribution_list="CNC Operators, Production Engineering, Quality Control",
    related_documents="SOP-2025-HP4X7R; Machine Manual DMG MORI CTX 450",
    purpose=(
        "To define the correct procedure for changing worn indexable cutting inserts on CNC lathes "
        "without damaging toolholders, and to ensure the correct insert grade is selected for the material being machined."
    ),
    scope=(
        "Applies to all Sandvik Coromant and Iscar indexable insert toolholders fitted to CNC lathes "
        "on the production floor. Applicable to turning, facing, and grooving operations."
    ),
    safety_notes=(
        "Isolate the CNC machine and press the E-STOP before accessing the turret or tool station. "
        "Cutting inserts are extremely sharp — use the insert removal tool, never fingers. "
        "Wear cut-resistant gloves and safety glasses when handling inserts. "
        "Dispose of worn inserts in the designated sharps container, not the general waste bin."
    ),
    training_required=1,
    training_details="CNC operators must hold NC-02 CNC lathe certification. New operators must be supervised for first 5 insert changes.",
)

insert_revision(cur, s3, version=1, notes="Initial draft submitted for review by Production Engineering team.",
    revised_by="Charlotte Fairweather", date="2025-01-08",
    approval_status="Under Review", approved_by=None, approval_date=None)

insert_definition(cur, s3, "Indexable Insert", "Replaceable cutting tip made from carbide, ceramic, or CBN — can be rotated to expose fresh cutting edges", 0)
insert_definition(cur, s3, "Toolholder", "The body that clamps the insert and connects to the machine turret", 1)
insert_definition(cur, s3, "ISO Grade", "Standardised code defining insert geometry, size, and cutting angle (e.g. CNMG 120408)", 2)
insert_definition(cur, s3, "Turret", "The rotating tool-holding unit on a CNC lathe that indexes between different tool positions", 3)

t3_keys = insert_tool(cur, s3, name="Torx Insert Clamping Key Set", type="Hand Tool",
    model_part_no="Sandvik 5717 079-01", specification="T15 / T20 Torx, hardened steel",
    image_uuid=images["spanners"], calibration_required=0)
t3_gauge = insert_tool(cur, s3, name="Digital Vernier Calliper", type="Measuring",
    model_part_no="Mitutoyo 500-196-30", specification="0–150 mm, 0.01 mm resolution, IP67",
    image_uuid=images["pressure_gauge"], calibration_required=1, calibration_due_date="2025-09-01")
t3_indicator = insert_tool(cur, s3, name="Dial Test Indicator", type="Measuring",
    model_part_no="Mitutoyo 2046AB", specification="0–10 mm range, 0.01 mm graduation",
    image_uuid=None, calibration_required=1, calibration_due_date="2025-09-01")

i3_insert = insert_item(cur, s3, name="Turning Insert CNMG 120408 MF2", part_no="CNMG120408-MF2 H13A",
    description="Sandvik Coromant, PVD-coated carbide, for steel and stainless turning", unit="each",
    image_uuid=images["cutting_insert"])
i3_grease = insert_item(cur, s3, name="Anti-Seize Compound", part_no="NEVERSEEZ-50G",
    description="Copper-based anti-seize paste for clamping screws", unit="tube")
i3_container = insert_item(cur, s3, name="Sharp Insert Disposal Container", part_no="SHARPS-METAL-2L",
    description="Metal sharps container for worn carbide inserts", unit="each")

st = insert_step(cur, s3, 1, 0,
    action="Stop machine cycle, press E-STOP and isolate",
    notes="Allow the current machining cycle to complete if safe to do so. Press the machine E-STOP button. Turn the main key switch to the locked position and remove the key. Affix your LOTO tag to the key switch.",
    expected_output="Machine at rest. E-STOP engaged. Key switch locked and tagged.")
attach_step_image(cur, st, images["cnc_machine"])

st = insert_step(cur, s3, 2, 1,
    action="Identify and index to the worn tool station",
    notes="Reference the machining programme or job card to identify which tool station requires the insert change. Note the ISO insert grade required — do not substitute without engineering approval.",
    expected_output="Correct tool station identified. Replacement insert grade confirmed against job card.")
attach_step_item(cur, st, i3_insert)

st = insert_step(cur, s3, 3, 2,
    action="Remove worn insert",
    notes="Using the correct Torx key, loosen the clamping screw anti-clockwise by half a turn. Lift the insert clear using the insert removal tool. Inspect the toolholder seating pocket for debris or damage. Clean the seating pocket with a dry cloth — no solvents.",
    expected_output="Worn insert removed. Seating pocket clean and undamaged.")
attach_step_tool(cur, st, t3_keys)
attach_step_item(cur, st, i3_container)
attach_step_image(cur, st, images["cutting_insert"])

st = insert_step(cur, s3, 4, 3,
    action="Fit new insert and torque clamping screw",
    notes="Apply a small amount of anti-seize compound to the clamping screw threads only — not the insert seat. Locate the new insert squarely in the pocket, ensuring the location pip engages. Hand-tighten the Torx clamping screw, then torque to 2.5 Nm as specified on the toolholder label.",
    expected_output="Insert seated correctly. Clamping screw torqued to specification. No insert movement when pushed laterally.")
attach_step_tool(cur, st, t3_keys)
attach_step_item(cur, st, i3_grease)

st = insert_step(cur, s3, 5, 4,
    action="Restore machine power and carry out a tool offset check",
    notes="Remove LOTO tag. Restore key switch. Power up. Use the machine's tool measurement cycle or manually jog to set the tool offset. Run a test pass in air before cutting material. Measure the first component and verify dimensions are within tolerance.",
    expected_output="Tool offset confirmed. First component dimensions within drawing tolerance.")
attach_step_tool(cur, st, t3_gauge)
attach_step_tool(cur, st, t3_indicator)
attach_step_image(cur, st, images["cnc_machine"])

st = insert_step(cur, s3, 6, 5,
    action="Record insert change in tool life log",
    notes="Enter the insert change in the tool life log sheet (located in the machine folder). Record: date, tool station, insert grade, operator name, and component number of the first part produced.",
    expected_output="Tool life log updated.")

# ===========================================================================
# SOP 4 — Monthly Fire Equipment Inspection
# ===========================================================================

s4 = insert_sop(cur,
    sop_id="SOP-2025-FE4X2K",
    title="Monthly Fire Equipment Visual Inspection",
    version=2,
    project_tag="H&S",
    department="Health & Safety",
    document_owner="Charlotte Fairweather",
    created_by="Thomas Ashworth",
    created_date="2024-01-15",
    active_date="2024-02-01",
    next_review_date="2025-02-01",
    approval_status="Approved",
    regulatory_ref="Regulatory Reform (Fire Safety) Order 2005; BS 5306-3:2017",
    distribution_list="H&S Manager, Facilities Manager, Department Heads",
    related_documents="Fire Risk Assessment FRA-2024-001; Annual Extinguisher Service Records",
    purpose=(
        "To provide a structured monthly visual inspection of all portable fire extinguishers "
        "and fire hose reels to confirm they are accessible, undamaged, and ready for immediate use."
    ),
    scope=(
        "Covers all portable fire extinguishers and fire hose reels across the main site — "
        "Buildings 1 through 5, including the car park and gatehouse. "
        "This procedure does not replace the mandatory annual service by a qualified engineer."
    ),
    safety_notes=(
        "Do not attempt to service or recharge extinguishers — this procedure is visual inspection only. "
        "If an extinguisher has been discharged, partially or fully, take it out of service immediately "
        "and report to the H&S Manager. Do not reinstate without a full service. "
        "Never obstruct extinguisher locations — clear a 1-metre radius at all times."
    ),
    training_required=0,
)

insert_revision(cur, s4, version=1, notes="Initial release to satisfy Fire Safety Order compliance requirement.",
    revised_by="Thomas Ashworth", date="2024-01-15",
    approval_status="Approved", approved_by="Charlotte Fairweather", approval_date="2024-01-22")
insert_revision(cur, s4, version=2, notes="Expanded to include hose reel inspection. Updated register reference.",
    revised_by="Charlotte Fairweather", date="2024-08-05",
    approval_status="Approved", approved_by="Oliver Hargreaves", approval_date="2024-08-09")

insert_definition(cur, s4, "Inspection Tag", "A dated card attached to each extinguisher confirming it has been inspected and by whom", 0)
insert_definition(cur, s4, "Tamper Seal", "A plastic tie through the safety pin confirming the extinguisher has not been discharged", 1)
insert_definition(cur, s4, "BS 5306-3", "British Standard for commissioning and maintenance of portable fire extinguishers", 2)

t4_torch = insert_tool(cur, s4, name="Inspection Torch", type="Inspection",
    model_part_no="Peli 7060", specification="LED, suitable for dark plant rooms",
    image_uuid=None, calibration_required=0)

i4_tag = insert_item(cur, s4, name="Monthly Inspection Tag", part_no="FIRE-TAG-MNTH",
    description="Pre-printed card with month/year and inspector signature field", unit="each")
i4_register = insert_item(cur, s4, name="Fire Equipment Register", part_no="FIRE-REG-SITE-01",
    description="Site master register of all extinguishers — location, type, serial number", unit="each")

st = insert_step(cur, s4, 1, 0,
    action="Collect inspection equipment and fire equipment register",
    notes="Collect the site fire equipment register from the H&S office. Take a torch for inspecting plant rooms and poorly-lit areas. Bring a supply of monthly inspection tags.",
    expected_output="Register in hand. Tags available. Torch functional.")
attach_step_tool(cur, st, t4_torch)
attach_step_item(cur, st, i4_register)
attach_step_item(cur, st, i4_tag)
attach_step_image(cur, st, images["fire_extinguisher"])

st = insert_step(cur, s4, 2, 1,
    action="Inspect each extinguisher against the register",
    notes="For each unit on the register, verify: (1) unit is in its designated location and accessible; (2) tamper seal and safety pin are intact; (3) pressure gauge needle is in the green zone; (4) body and hose show no visible damage, corrosion, or dents; (5) operating instructions are legible.",
    expected_output="All units located. Seals intact. Gauges in green. No damage observed.")
attach_step_image(cur, st, images["fire_extinguisher"])

st = insert_step(cur, s4, 3, 2,
    action="Attach inspection tag and update register",
    notes="Attach a new dated inspection tag to the extinguisher handle or mounting bracket. Record the result — Pass or Fail — in the fire equipment register against each serial number. Note any defects in the comments column.",
    expected_output="Inspection tag attached to each unit. Register updated with date and result.")
attach_step_item(cur, st, i4_tag)
attach_step_item(cur, st, i4_register)

st = insert_step(cur, s4, 4, 3,
    action="Inspect fire hose reels",
    notes="Check each hose reel for: hose integrity (no cracks or weeping joints); reel rotation is free; valve operates; hose runs out to full length. Retract and re-coil neatly after check. If any fault is found, affix an Out of Service tag and notify Facilities Management.",
    expected_output="All hose reels functional and correctly stowed.")

st = insert_step(cur, s4, 5, 4,
    action="Report any failures and file completed register",
    notes="If any extinguisher or hose reel has failed the inspection, raise a fault report to the H&S Manager and Facilities Manager within 2 hours. File the completed register in the fire safety folder. A copy must be retained for at least 3 years.",
    expected_output="Faults reported. Register signed, dated, and filed.")
attach_step_image(cur, st, images["safety_helmet"])

# ---------------------------------------------------------------------------
# App config
# ---------------------------------------------------------------------------
cur.execute("INSERT OR REPLACE INTO app_config (key, value) VALUES ('company_name', 'Hallsworth Engineering Ltd')")
cur.execute("INSERT OR REPLACE INTO app_config (key, value) VALUES ('updater_dismissed_version', '')")

conn.commit()
conn.close()

print("Done. Database seeded with 4 SOPs:")
print("  SOP-2025-HP4X7R  Hydraulic Press Pre-Operation Inspection   [Approved]")
print("  SOP-2025-CD9M2P  Chemical Drum Decanting Procedure           [Approved]")
print("  SOP-2025-CL3W8N  CNC Lathe Indexable Insert Change           [Under Review]")
print("  SOP-2025-FE4X2K  Monthly Fire Equipment Visual Inspection    [Approved]")
