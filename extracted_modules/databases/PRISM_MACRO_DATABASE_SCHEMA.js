const PRISM_MACRO_DATABASE_SCHEMA = {
    version: "13",
    source: "OPEN MIND Macro Database Schema",
    supportedDatabases: ["SQLite", "MariaDB", "SQL Server", "MS Access"],

    tables: {
        Properties: {
            columns: {
                Name: { type: "CHAR(255)", primaryKey: true, unique: true },
                Value: { type: "CHAR(255)", notNull: true }
            }
        },
        MacroType: {
            columns: {
                ID: { type: "INTEGER", primaryKey: true, autoIncrement: true },
                Name: { type: "CHAR(255)", notNull: true },
                FreeParameter_1: { type: "VARCHAR" },
                FreeParameter_2: { type: "VARCHAR" },
                FreeParameter_3: { type: "VARCHAR" }
            }
        },
        Machine_Group: {
            columns: {
                Name: { type: "CHAR(255)", notNull: true },
                FreeParameter_1: { type: "VARCHAR" },
                FreeParameter_2: { type: "VARCHAR" },
                FreeParameter_3: { type: "VARCHAR" }
            }
        },
        Material_Group: {
            columns: {
                Name: { type: "CHAR(255)", notNull: true },
                FreeParameter_1: { type: "VARCHAR" },
                FreeParameter_2: { type: "VARCHAR" },
                FreeParameter_3: { type: "VARCHAR" }
            }
        },
        Machine: {
            columns: {
                Name: { type: "CHAR(255)", notNull: true },
                GroupName: { type: "CHAR(255)", notNull: true },
                FreeParameter_1: { type: "VARCHAR" },
                FreeParameter_2: { type: "VARCHAR" },
                FreeParameter_3: { type: "VARCHAR" }
            }
        },
        Material: {
            columns: {
                Name: { type: "CHAR(255)", notNull: true },
                GroupName: { type: "CHAR(255)", notNull: true },
                FreeParameter_1: { type: "VARCHAR" },
                FreeParameter_2: { type: "VARCHAR" },
                FreeParameter_3: { type: "VARCHAR" }
            }
        },
        Job: {
            columns: {
                JobKey: { type: "INTEGER", primaryKey: true, autoIncrement: true },
                ID: { type: "CHAR(36)", notNull: true },
                RefJobID: { type: "CHAR(36)", notNull: true },
                BaseJobID: { type: "CHAR(36)", notNull: true },
                ParentJobID: { type: "CHAR(36)", notNull: true },
                StockRefJobID: { type: "CHAR(36)", notNull: true },
                FeatureRefIDs: { type: "VARCHAR", notNull: true },
                MacroID: { type: "CHAR(36)", notNull: true },
                MacroSequence: { type: "INTEGER", notNull: true },
                UseNameAutoText: { type: "SMALLINT", notNull: true },
                JobName: { type: "CHAR(255)", notNull: true },
                SystemJobType: { type: "CHAR(50)", notNull: true },
                JobType: { type: "CHAR(50)", notNull: true },
                GenerateStock: { type: "SMALLINT", notNull: true },
                StockResolution: { type: "DOUBLE PRECISION", notNull: true },
                ToolDataType: { type: "CHAR(50)", notNull: true },
                ToolType: { type: "INTEGER", notNull: true },
                ToolName: { type: "CHAR(255)", notNull: true },
                ToolNumber: { type: "CHAR(50)", notNull: true },
                ToolDiameter: { type: "DOUBLE PRECISION", notNull: true },
                ToolTolerance: { type: "DOUBLE PRECISION", notNull: true },
                ToolMinLength: { type: "DOUBLE PRECISION", notNull: true },
                JobParaCRC32: { type: "INTEGER", notNull: true },
                ToolGeometry: { type: "BINARY" },
                HeadGeometry: { type: "BINARY" },
                HolderGeometry: { type: "BINARY" }
            },
            indexes: ["JobParaIDIdx ON Job_Parameter (JobID)"]
        },
        Job_Parameter: {
            columns: {
                JobID: { type: "INTEGER", notNull: true },
                Usage: { type: "VARCHAR", notNull: true },
                ParaName: { type: "VARCHAR", notNull: true },
                ParaValue: { type: "VARCHAR", notNull: true },
                FreeParameter_1: { type: "VARCHAR" },
                FreeParameter_2: { type: "VARCHAR" },
                FreeParameter_3: { type: "VARCHAR" }
            }
        }
    }
}