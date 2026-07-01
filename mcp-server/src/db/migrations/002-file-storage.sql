-- Migration 002: File Storage + Parts Library
-- PRISM Phase 6 Session 6-2: File Upload + CAD Storage + Parts Library
--
-- Tables: files, file_versions, file_attachments, parts, part_revisions

-- ============================================================================
-- FILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(200) NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  sha256 VARCHAR(64) NOT NULL,
  storage_backend VARCHAR(20) NOT NULL DEFAULT 'local' CHECK (storage_backend IN ('local', 's3')),
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  current_version INTEGER NOT NULL DEFAULT 1,
  deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_sha256 ON files(sha256);
CREATE INDEX idx_files_name_trgm ON files USING gin(original_name gin_trgm_ops);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);

-- ============================================================================
-- FILE VERSIONS (immutable history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS file_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  sha256 VARCHAR(64) NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  change_description TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(file_id, version)
);

CREATE INDEX idx_file_versions_file ON file_versions(file_id);

-- ============================================================================
-- FILE ATTACHMENTS (polymorphic join: file ↔ entity)
-- ============================================================================
CREATE TABLE IF NOT EXISTS file_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
    'quote', 'job', 'part', 'quality_record', 'customer', 'machine',
    'tool', 'material_cert', 'inspection', 'ncr', 'capa', 'fai'
  )),
  entity_id UUID NOT NULL,
  attachment_type VARCHAR(50) DEFAULT 'general' CHECK (attachment_type IN (
    'general', 'cad_model', 'drawing', 'material_cert', 'inspection_report',
    'setup_sheet', 'photo', 'video', 'program', 'documentation'
  )),
  notes TEXT,
  attached_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_file_attachments_entity ON file_attachments(entity_type, entity_id);
CREATE INDEX idx_file_attachments_file ON file_attachments(file_id);

-- ============================================================================
-- PARTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number VARCHAR(100) NOT NULL,
  name VARCHAR(300) NOT NULL,
  description TEXT,
  current_revision VARCHAR(20) NOT NULL DEFAULT 'A',
  material_id UUID REFERENCES materials(id),
  customer_id UUID,
  tags TEXT[] DEFAULT '{}',
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'obsolete', 'prototype', 'archived')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_parts_part_number ON parts(part_number) WHERE status != 'archived';
CREATE INDEX idx_parts_tags ON parts USING gin(tags);
CREATE INDEX idx_parts_name_trgm ON parts USING gin(name gin_trgm_ops);
CREATE INDEX idx_parts_customer ON parts(customer_id);

-- ============================================================================
-- PART REVISIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS part_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  revision VARCHAR(20) NOT NULL,
  cad_file_id UUID REFERENCES files(id),
  drawing_file_id UUID REFERENCES files(id),
  change_description TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(part_id, revision)
);

CREATE INDEX idx_part_revisions_part ON part_revisions(part_id);
