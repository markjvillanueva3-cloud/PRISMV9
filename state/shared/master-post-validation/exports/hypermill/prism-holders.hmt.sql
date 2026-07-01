-- hyperMILL Holder Database (PRISM export)
-- Schema mirrors HYPERMILL_HOLDER_FIELDS + HYPERMILL_COUPLING_FIELDS (hypermill-tool-schema-notes.ts)
-- Import via: hyperMILL Tool Database > File > Import SQLite

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS Manufacturers (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Couplings (
  coupling_id     INTEGER PRIMARY KEY,
  type            INTEGER NOT NULL DEFAULT 0,
  class           TEXT    NOT NULL DEFAULT '',
  iso_code        TEXT    NOT NULL DEFAULT '',
  mm_system_id    INTEGER NOT NULL DEFAULT 1,
  min_dia         REAL    NOT NULL DEFAULT 0.0,
  max_dia         REAL    NOT NULL DEFAULT 0.0,
  min_len         REAL    NOT NULL DEFAULT 0.0,
  max_len         REAL    NOT NULL DEFAULT 0.0,
  min_square_size REAL    NOT NULL DEFAULT 0.0,
  max_square_size REAL    NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS Holders (
  id                   INTEGER PRIMARY KEY,
  name                 TEXT    NOT NULL,
  ordering_code        TEXT    NOT NULL DEFAULT '',
  manufacturer_id      INTEGER NOT NULL DEFAULT 1 REFERENCES Manufacturers(id),
  mm_system_id         INTEGER NOT NULL DEFAULT 1,
  top_coupling_id      INTEGER NOT NULL DEFAULT 0 REFERENCES Couplings(coupling_id),
  bottom_coupling_id   INTEGER NOT NULL DEFAULT 0 REFERENCES Couplings(coupling_id),
  spindle_speed_factor REAL    NOT NULL DEFAULT 1.0,
  feedrate_factor      REAL    NOT NULL DEFAULT 1.0,
  infeed_width_factor  REAL    NOT NULL DEFAULT 1.0,
  infeed_length_factor REAL    NOT NULL DEFAULT 1.0,
  max_spindle_speed    REAL    NOT NULL DEFAULT 0.0,
  max_feedrate         REAL    NOT NULL DEFAULT 0.0,
  coolant_through      INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO Manufacturers (id, name) VALUES (1, 'PRISM Catalog');
-- Couplings (spindle-side + tool-side interfaces)
INSERT INTO Couplings (coupling_id, type, class, iso_code, mm_system_id) VALUES (1, 3, 'CAT40', 'ANSI_B5.50', 1);
INSERT INTO Couplings (coupling_id, type, class, iso_code, mm_system_id) VALUES (2, 14, 'ER', 'DIN6499', 1);
INSERT INTO Couplings (coupling_id, type, class, iso_code, mm_system_id) VALUES (3, 3, 'CAT50', 'ANSI_B5.50', 1);
INSERT INTO Couplings (coupling_id, type, class, iso_code, mm_system_id) VALUES (4, 2, 'BT30', 'JIS_B6339', 1);
INSERT INTO Couplings (coupling_id, type, class, iso_code, mm_system_id) VALUES (5, 2, 'BT40', 'JIS_B6339', 1);
INSERT INTO Couplings (coupling_id, type, class, iso_code, mm_system_id) VALUES (6, 1, 'HSK-A63', 'DIN69893', 1);
INSERT INTO Couplings (coupling_id, type, class, iso_code, mm_system_id) VALUES (7, 1, 'HSK-A100', 'DIN69893', 1);
INSERT INTO Couplings (coupling_id, type, class, iso_code, mm_system_id) VALUES (8, 10, 'ER', 'DIN6499', 1);
INSERT INTO Couplings (coupling_id, type, class, iso_code, mm_system_id) VALUES (9, 11, 'ShrinkFit', 'DIN69882', 1);
-- Holders
INSERT INTO Holders (id, name, ordering_code, manufacturer_id, mm_system_id, top_coupling_id, bottom_coupling_id, spindle_speed_factor, feedrate_factor, infeed_width_factor, infeed_length_factor, max_spindle_speed, max_feedrate, coolant_through) VALUES (1, 'CAT40', 'CAT40', 1, 1, 1, 2, 1.0, 1.0, 1.0, 1.0, 15000.0, 0.0, 0);
INSERT INTO Holders (id, name, ordering_code, manufacturer_id, mm_system_id, top_coupling_id, bottom_coupling_id, spindle_speed_factor, feedrate_factor, infeed_width_factor, infeed_length_factor, max_spindle_speed, max_feedrate, coolant_through) VALUES (2, 'CAT50', 'CAT50', 1, 1, 3, 2, 1.0, 1.0, 1.0, 1.0, 8000.0, 0.0, 0);
INSERT INTO Holders (id, name, ordering_code, manufacturer_id, mm_system_id, top_coupling_id, bottom_coupling_id, spindle_speed_factor, feedrate_factor, infeed_width_factor, infeed_length_factor, max_spindle_speed, max_feedrate, coolant_through) VALUES (3, 'BT30', 'BT30', 1, 1, 4, 2, 1.0, 1.0, 1.0, 1.0, 24000.0, 0.0, 0);
INSERT INTO Holders (id, name, ordering_code, manufacturer_id, mm_system_id, top_coupling_id, bottom_coupling_id, spindle_speed_factor, feedrate_factor, infeed_width_factor, infeed_length_factor, max_spindle_speed, max_feedrate, coolant_through) VALUES (4, 'BT40', 'BT40', 1, 1, 5, 2, 1.0, 1.0, 1.0, 1.0, 15000.0, 0.0, 0);
INSERT INTO Holders (id, name, ordering_code, manufacturer_id, mm_system_id, top_coupling_id, bottom_coupling_id, spindle_speed_factor, feedrate_factor, infeed_width_factor, infeed_length_factor, max_spindle_speed, max_feedrate, coolant_through) VALUES (5, 'HSK-A63', 'HSK-A63', 1, 1, 6, 2, 1.0, 1.0, 1.0, 1.0, 25000.0, 0.0, 0);
INSERT INTO Holders (id, name, ordering_code, manufacturer_id, mm_system_id, top_coupling_id, bottom_coupling_id, spindle_speed_factor, feedrate_factor, infeed_width_factor, infeed_length_factor, max_spindle_speed, max_feedrate, coolant_through) VALUES (6, 'HSK-A100', 'HSK-A100', 1, 1, 7, 2, 1.0, 1.0, 1.0, 1.0, 12000.0, 0.0, 0);
INSERT INTO Holders (id, name, ordering_code, manufacturer_id, mm_system_id, top_coupling_id, bottom_coupling_id, spindle_speed_factor, feedrate_factor, infeed_width_factor, infeed_length_factor, max_spindle_speed, max_feedrate, coolant_through) VALUES (7, 'ER32-COLLET', 'ER32-COLLET', 1, 1, 1, 8, 1.0, 1.0, 1.0, 1.0, 30000.0, 0.0, 0);
INSERT INTO Holders (id, name, ordering_code, manufacturer_id, mm_system_id, top_coupling_id, bottom_coupling_id, spindle_speed_factor, feedrate_factor, infeed_width_factor, infeed_length_factor, max_spindle_speed, max_feedrate, coolant_through) VALUES (8, 'SHRINK-FIT-D12', 'SHRINK-FIT-D12', 1, 1, 1, 9, 1.0, 1.0, 1.0, 1.0, 42000.0, 0.0, 0);
