# Knowledge Dispatcher Action Subset Audit
## QA-MS6 P0-U03: Knowledge Engine Action Subset Audit

**Generated:** 2026-04-12T22:55:00Z

---

## Summary

| Metric | Count | Status |
|--------|-------|--------|
| Total Actions | 133 | Inventoried |
| Action Groups | 13 | Categorized |
| Engines Used | 8+ | Mapped |
| Case Statements | 144 | Verified |

---

## Action Distribution

| Group | Count | Domain |
|-------|-------|--------|
| Core Knowledge | 5 | Registry queries |
| Tribal Knowledge | 5 | Tribal tips |
| Academy | 11 | Training courses |
| Visual Lab | 7 | Visual learning |
| Knowledge Graph | 5 | Graph operations |
| Troubleshoot | 4 | Diagnostics |
| Instructor | 6 | Class management |
| Course Builder | 5 | Course creation |
| Learn Pipeline | 51 | Learning ingestion |
| PDF Extraction | 9 | PDF processing |
| Catalog Extraction | 8 | Catalog processing |
| MIT Academic | 12 | Academic extraction |
| Ingestion Pipeline | 5 | General ingestion |

---

## Detailed Action Inventory

### Core Knowledge (5 actions)
| Action | Purpose | Engine |
|--------|---------|--------|
| search | Cross-registry search | KnowledgeQueryEngine |
| cross_query | Multi-registry query | KnowledgeQueryEngine |
| formula | Formula lookup | KnowledgeQueryEngine |
| relations | Entity relations | KnowledgeQueryEngine |
| stats | Registry statistics | KnowledgeQueryEngine |

### Tribal Knowledge (5 actions)
| Action | Purpose | Engine |
|--------|---------|--------|
| tribal_capture | Capture tribal tip | TribalKnowledgeEngine |
| tribal_search | Search tribal knowledge | TribalKnowledgeEngine |
| tribal_suggest | Suggest tribal tips | TribalKnowledgeEngine |
| tribal_stats | Tribal stats | TribalKnowledgeEngine |
| tribal_recategorize | Recategorize tips | TribalKnowledgeEngine |

### Academy (11 actions)
| Action | Purpose | Engine |
|--------|---------|--------|
| academy_courses | List courses | AcademyEngine |
| academy_course_detail | Course details | AcademyEngine |
| academy_start_course | Start course | AcademyEngine |
| academy_complete_lesson | Complete lesson | AcademyEngine |
| academy_quiz_start | Start quiz | AcademyEngine |
| academy_quiz_answer | Submit answer | AcademyEngine |
| academy_quiz_result | Quiz results | AcademyEngine |
| academy_dashboard | Student dashboard | AcademyEngine |
| academy_certification_check | Check certification | AcademyEngine |
| academy_formula_cards | Formula flashcards | AcademyEngine |
| academy_generate_questions | Generate questions | AcademyEngine |

### Visual Lab (7 actions)
| Action | Purpose | Engine |
|--------|---------|--------|
| visual_lab_tool | Visualize tool | VisualLabEngine |
| visual_lab_workpiece | Visualize workpiece | VisualLabEngine |
| visual_lab_animation | Cutting animation | VisualLabEngine |
| visual_lab_toolpath | Toolpath visual | VisualLabEngine |
| visual_lab_stress | Stress visualization | VisualLabEngine |
| visual_lab_chip | Chip formation | VisualLabEngine |
| visual_lab_params | Parameter visuals | VisualLabEngine |

### Knowledge Graph (5 actions)
| Action | Purpose | Engine |
|--------|---------|--------|
| kg_schema | Get KG schema | ManufacturingKnowledgeGraphEngine |
| kg_populate | Populate KG | ManufacturingKnowledgeGraphEngine |
| kg_query | Query KG | ManufacturingKnowledgeGraphEngine |
| kg_recommend | KG recommendations | ManufacturingKnowledgeGraphEngine |
| kg_gap | Identify gaps | ManufacturingKnowledgeGraphEngine |

### Troubleshoot (4 actions)
| Action | Purpose | Engine |
|--------|---------|--------|
| troubleshoot_diagnose | Diagnose issue | TroubleshootTreeEngine |
| troubleshoot_by_symptom | Search by symptom | TroubleshootTreeEngine |
| troubleshoot_tree | Get decision tree | TroubleshootTreeEngine |
| troubleshoot_common | Common issues | TroubleshootTreeEngine |

### Instructor Dashboard (6 actions)
| Action | Purpose | Engine |
|--------|---------|--------|
| instructor_create_class | Create class | InstructorDashboardEngine |
| instructor_enroll | Enroll student | InstructorDashboardEngine |
| instructor_grades | View grades | InstructorDashboardEngine |
| instructor_analytics | Class analytics | InstructorDashboardEngine |
| instructor_export | Export data | InstructorDashboardEngine |
| instructor_assign | Assign work | InstructorDashboardEngine |

### Course Builder (5 actions)
| Action | Purpose | Engine |
|--------|---------|--------|
| course_build | Build course | CourseBuilderEngine |
| course_build_from_rules | Rules-based course | CourseBuilderEngine |
| course_catalog | Course catalog | CourseBuilderEngine |
| course_quiz_generate | Generate quiz | CourseBuilderEngine |
| course_pricing | Course pricing | CourseBuilderEngine |

### Learn Pipeline (51 actions)
#### Ingestion (8)
- learn_ingest_text, learn_ingest_video, learn_ingest_document, learn_ingest_url
- learn_auto_tag, learn_dedup_check, learn_search_knowledge, learn_get_stats

#### Video Processing (4)
- learn_video_process, learn_video_transcript, learn_video_keyframes, learn_video_knowledge

#### Sessions (4)
- learn_session_create, learn_session_submit, learn_session_clarify, learn_session_summary

#### URL Processing (2)
- learn_url_extract, learn_url_detect

#### Social Media (2)
- learn_social_parse, learn_social_batch

#### Knowledge Linking (3)
- learn_auto_link, learn_gap_detect, learn_validate_physics

#### Search Enhancement (2)
- learn_search_enhanced, learn_context_recommend

#### Course Auto-Generation (7)
- learn_course_build, learn_course_from_rules, learn_course_catalog
- learn_course_quiz, learn_course_pricing, learn_course_from_source, learn_course_export

#### Curriculum Bridge (6)
- learn_curriculum_rpm, learn_curriculum_force, learn_curriculum_toollife
- learn_curriculum_material, learn_curriculum_feedrate, learn_curriculum_problemset

#### Feedback Loop (5)
- learn_feedback_record, learn_feedback_profile, learn_feedback_calibrate
- learn_feedback_predict, learn_feedback_compare

#### Transfer Learning (4)
- learn_transfer_similarity, learn_transfer_scale, learn_transfer_apply, learn_transfer_validate

#### Fleet Learning (4)
- learn_fleet_status, learn_fleet_plan, learn_fleet_feedback, learn_fleet_summary

### PDF Extraction (9 actions)
| Action | Purpose | Engine |
|--------|---------|--------|
| pdf_source_list | List PDF sources | PDFExtractionEngine |
| pdf_source_stats | Source statistics | PDFExtractionEngine |
| pdf_source_discover | Discover sources | PDFExtractionEngine |
| pdf_extract_tables | Extract tables | PDFExtractionEngine |
| pdf_extract_formulas | Extract formulas | PDFExtractionEngine |
| pdf_extract_materials | Extract materials | PDFExtractionEngine |
| pdf_batch_process | Batch processing | PDFExtractionEngine |
| pdf_batch_priority | Priority queue | PDFExtractionEngine |
| pdf_batch_stats | Batch stats | PDFExtractionEngine |

### Catalog Extraction (8 actions)
| Action | Purpose | Engine |
|--------|---------|--------|
| resource_scan | Scan resources | CatalogExtractionEngine |
| resource_stats | Resource stats | CatalogExtractionEngine |
| resource_pending | Pending resources | CatalogExtractionEngine |
| resource_report | Resource report | CatalogExtractionEngine |
| catalog_extract | Extract catalog | CatalogExtractionEngine |
| catalog_merge | Merge catalogs | CatalogExtractionEngine |
| catalog_export | Export catalog | CatalogExtractionEngine |
| catalog_stats | Catalog stats | CatalogExtractionEngine |

### MIT Academic (12 actions)
| Action | Purpose | Engine |
|--------|---------|--------|
| mit_course_stats | Course statistics | MITCourseEngine |
| mit_course_algorithms | Algorithm list | MITCourseEngine |
| mit_course_engine_map | Engine mapping | MITCourseEngine |
| mit_course_search | Course search | MITCourseEngine |
| mit_course_manufacturing | Manufacturing courses | MITCourseEngine |
| mit_course_report | Course report | MITCourseEngine |
| mit_course_data | Course data | MITCourseEngine |
| lecture_scan_course | Scan lectures | LectureExtractionEngine |
| lecture_extract_formulas | Extract formulas | LectureExtractionEngine |
| lecture_get_formulas | Get formulas | LectureExtractionEngine |
| lecture_get_problems | Get problems | LectureExtractionEngine |
| lecture_stats | Lecture stats | LectureExtractionEngine |

### Ingestion Pipeline (5 actions)
| Action | Purpose | Engine |
|--------|---------|--------|
| ingestion_discover | Discover content | IngestionOrchestratorEngine |
| ingestion_pending | Pending items | IngestionOrchestratorEngine |
| ingestion_run | Run ingestion | IngestionOrchestratorEngine |
| ingestion_ingest_one | Ingest single item | IngestionOrchestratorEngine |
| ingestion_stats | Ingestion stats | IngestionOrchestratorEngine |

---

## Engine Mapping Summary

| Engine | Action Count | Domain |
|--------|--------------|--------|
| KnowledgeQueryEngine | 5 | Core queries |
| TribalKnowledgeEngine | 5 | Tribal tips |
| AcademyEngine | 11 | Training |
| VisualLabEngine | 7 | Visualization |
| ManufacturingKnowledgeGraphEngine | 5 | KG ops |
| TroubleshootTreeEngine | 4 | Diagnostics |
| InstructorDashboardEngine | 6 | Classes |
| CourseBuilderEngine | 5 | Course creation |
| LearningPipelineEngine | 51 | Learning |
| PDFExtractionEngine | 9 | PDF |
| CatalogExtractionEngine | 8 | Catalogs |
| MITCourseEngine | 7 | MIT courses |
| LectureExtractionEngine | 5 | Lectures |
| IngestionOrchestratorEngine | 5 | Ingestion |

---

## Verification

| Check | Status |
|-------|--------|
| All 133 actions inventoried | YES |
| Action groups mapped | YES |
| Engines identified | YES |
| Case statements match | YES (144 with some multi-action cases) |

---

## Conclusion

**QA-MS6 P0-U03 is COMPLETE** — The prism_knowledge dispatcher has
133 actions across 13 action groups, served by 14 distinct engines.

The Learn Pipeline (51 actions) is the largest group, covering
comprehensive knowledge ingestion, video processing, course generation,
curriculum bridging, feedback loops, and fleet learning.

---

*QA-MS6 P0-U03 — Knowledge engine action subset audit complete*
