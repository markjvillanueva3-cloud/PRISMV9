-- 009-presets-learning.sql — Preset libraries + learning progression
-- Session 6-10: Preset Libraries + Learning Backend

-- ─── Preset Library ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS presets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  preset_type   TEXT NOT NULL
                CHECK (preset_type IN ('speed_feed', 'toolpath', 'ppg_controller', 'machine_setup', 'fixture', 'holder', 'tool_assembly')),
  name          TEXT NOT NULL,
  description   TEXT,
  params        JSONB NOT NULL DEFAULT '{}',
  tags          TEXT[] DEFAULT '{}',
  machine_id    TEXT,
  material_id   TEXT,
  operation     TEXT,                     -- e.g., 'pocket', 'profile', 'drilling'
  is_shared     BOOLEAN NOT NULL DEFAULT false,
  shared_by     TEXT,
  use_count     INTEGER NOT NULL DEFAULT 0,
  validated     BOOLEAN NOT NULL DEFAULT false,
  validation_errors TEXT[],
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_presets_user ON presets(user_id);
CREATE INDEX IF NOT EXISTS idx_presets_type ON presets(preset_type);
CREATE INDEX IF NOT EXISTS idx_presets_shared ON presets(is_shared) WHERE is_shared = true;
CREATE INDEX IF NOT EXISTS idx_presets_tags ON presets USING GIN(tags);

CREATE TABLE IF NOT EXISTS preset_compare_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  preset_ids    UUID[] NOT NULL,
  comparison    JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Learning Courses ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS learning_courses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  domain        TEXT NOT NULL,             -- 'CAD', 'CAM', 'ShopPractice', 'MachineOperation'
  difficulty    TEXT NOT NULL DEFAULT 'beginner'
                CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
  modules       JSONB NOT NULL DEFAULT '[]',  -- ordered array of module objects
  prerequisites UUID[],                    -- course IDs required before enrollment
  tags          TEXT[] DEFAULT '{}',
  machine_type  TEXT,                      -- e.g., 'VMC', 'HMC', 'Lathe', 'Swiss'
  material_focus TEXT,                     -- e.g., 'aluminum', 'titanium', 'steel'
  cam_system    TEXT,                      -- e.g., 'Fusion360', 'hyperMILL', 'Mastercam'
  process_type  TEXT,                      -- e.g., 'milling', 'turning', 'EDM'
  estimated_hours NUMERIC(5,1),
  is_published  BOOLEAN NOT NULL DEFAULT false,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courses_domain ON learning_courses(domain);
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON learning_courses(difficulty);
CREATE INDEX IF NOT EXISTS idx_courses_tags ON learning_courses USING GIN(tags);

-- ─── Enrollments ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS learning_enrollments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  course_id     UUID NOT NULL REFERENCES learning_courses(id),
  status        TEXT NOT NULL DEFAULT 'enrolled'
                CHECK (status IN ('enrolled', 'in_progress', 'completed', 'dropped')),
  current_module_idx SMALLINT NOT NULL DEFAULT 0,
  progress_pct  SMALLINT NOT NULL DEFAULT 0,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  score         NUMERIC(5,2),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- ─── Checkpoints ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS learning_checkpoints (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES learning_enrollments(id),
  module_idx    SMALLINT NOT NULL,
  checkpoint_type TEXT NOT NULL CHECK (checkpoint_type IN ('quiz', 'exam', 'practical')),
  questions     JSONB NOT NULL DEFAULT '[]',
  answers       JSONB DEFAULT '[]',
  score         NUMERIC(5,2),
  passed        BOOLEAN,
  pass_threshold NUMERIC(5,2) NOT NULL DEFAULT 70.0,
  attempted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_sec  INTEGER
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_enrollment ON learning_checkpoints(enrollment_id);

-- ─── Learning Media ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS learning_media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID REFERENCES learning_courses(id),
  module_idx    SMALLINT,
  media_type    TEXT NOT NULL CHECK (media_type IN ('video', 'pdf', 'image', 'interactive', 'reference')),
  title         TEXT NOT NULL,
  url           TEXT,
  file_id       UUID,
  duration_sec  INTEGER,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_course ON learning_media(course_id);
