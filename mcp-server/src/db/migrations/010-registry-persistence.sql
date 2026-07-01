-- Migration 010: Registry Persistence — JSONB Columns for Materials & Machines
-- INFRA-1-2 U-PER2: Enable full-fidelity registry round-trips through PostgreSQL
-- All statements are idempotent (ADD COLUMN IF NOT EXISTS)

-- ============================================================================
-- MATERIALS — Add JSONB columns for nested physics/machining objects
-- ============================================================================

-- Classification & designations
ALTER TABLE materials ADD COLUMN IF NOT EXISTS material_type VARCHAR(100);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS iso_p_equivalent VARCHAR(20);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS condition VARCHAR(100);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS classification JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS designation JSONB;

-- Core physics objects (nested structures from MaterialRegistry)
ALTER TABLE materials ADD COLUMN IF NOT EXISTS physical JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS mechanical JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS thermal JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS machining JSONB;

-- Advanced coefficients (Kienzle kc1.1/mc, Johnson-Cook, Taylor C/n)
ALTER TABLE materials ADD COLUMN IF NOT EXISTS kienzle JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS johnson_cook JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS taylor JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS tribology JSONB;

-- Extended machining characteristics (v10 deep accuracy)
ALTER TABLE materials ADD COLUMN IF NOT EXISTS chip_formation JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS thermal_machining JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS surface_integrity JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS machinability JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS cutting_recommendations JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS surface JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS process_specific JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS weldability JSONB;

-- Chemistry / composition
ALTER TABLE materials ADD COLUMN IF NOT EXISTS chemistry JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS composition JSONB;

-- Data quality & statistics
ALTER TABLE materials ADD COLUMN IF NOT EXISTS data_quality VARCHAR(50);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS data_sources TEXT[];
ALTER TABLE materials ADD COLUMN IF NOT EXISTS statistics JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS standards JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS param_count INTEGER;

-- Usage
ALTER TABLE materials ADD COLUMN IF NOT EXISTS common_names TEXT[];
ALTER TABLE materials ADD COLUMN IF NOT EXISTS applications TEXT[];
ALTER TABLE materials ADD COLUMN IF NOT EXISTS sources TEXT[];

-- Metadata object
ALTER TABLE materials ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Upsert index on name (for BusinessStore ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_name_unique ON materials(name);


-- ============================================================================
-- MACHINES — Add JSONB columns for nested specification objects
-- ============================================================================

-- Re-add manufacturer as alias for brand (registry uses "manufacturer")
ALTER TABLE machines ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(100);

-- Nested specification objects
ALTER TABLE machines ADD COLUMN IF NOT EXISTS envelope JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS spindle JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS axes JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS tool_changer JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS table_specs JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS controller_specs JSONB;

-- Physical
ALTER TABLE machines ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(12,2);
ALTER TABLE machines ADD COLUMN IF NOT EXISTS footprint JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS power_requirement_kva NUMERIC(8,2);

-- Capabilities
ALTER TABLE machines ADD COLUMN IF NOT EXISTS simultaneous_axes INTEGER;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS high_speed_machining BOOLEAN DEFAULT false;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS rigid_tapping BOOLEAN DEFAULT false;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS probing_ready BOOLEAN DEFAULT false;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS automation_ready BOOLEAN DEFAULT false;

-- Metadata
ALTER TABLE machines ADD COLUMN IF NOT EXISTS layer VARCHAR(50);
ALTER TABLE machines ADD COLUMN IF NOT EXISTS year_introduced INTEGER;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS price_range JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS typical_applications TEXT[];
ALTER TABLE machines ADD COLUMN IF NOT EXISTS kinematic_chain JSONB;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Array columns
ALTER TABLE machines ADD COLUMN IF NOT EXISTS options TEXT[];

-- Name column (registry primary lookup key)
ALTER TABLE machines ADD COLUMN IF NOT EXISTS name VARCHAR(200);

-- Upsert index on name (for BusinessStore ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_machines_name_unique ON machines(name);
