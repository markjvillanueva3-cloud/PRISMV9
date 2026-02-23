/**
 * PRISM Knowledge Base - MIT Course Scanner
 * Scans MIT COURSES directory and catalogs available courses
 * 
 * @version 1.0.0
 * @date 2026-01-21
 */

const fs = require('fs');
const path = require('path');

const MIT_COURSES_ROOT = 'C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\MIT COURSES';

// Course categories relevant to PRISM
const PRISM_RELEVANT_PREFIXES = {
    manufacturing: ['2.007', '2.008', '2.810', '2.830', '2.852', '2.00', '2.14', '2.15', '2.03', '2.99'],
    algorithms: ['6.006', '6.046', '6.851', '6.854', '6.00', '6.09'],
    optimization: ['6.251', '6.255', '15.05', '15.08', '15.09', '15.87'],
    ml_ai: ['6.867', '6.034', '6.871', '9.52', '6.82', '6.89', '18.S19'],
    control: ['2.14', '6.302', '2.151', '2.003', '16.31', '16.41'],
    signal: ['6.003', '6.341', '6.011', '6.033'],
    cad_graphics: ['6.837', '6.838', '18.085', '4.461'],
    materials: ['3.21', '3.225', '3.042', '3.00', '10.34', '10.49'],
    systems: ['esd.', '16.85', '16.35', '11.'],
    statistics: ['18.4', '15.06', '1.010', '9.40']
};

/**
 * Scan directory for course archives and folders
 */
function scanDirectory(dirPath, results = []) {
    try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Check if it's a course folder (has data.json)
                const dataJsonPath = path.join(fullPath, 'data.json');
                if (fs.existsSync(dataJsonPath)) {
                    results.push({
                        type: 'extracted',
                        courseId: item,
                        path: fullPath,
                        hasContent: true
                    });
                } else if (item.startsWith('MIT COURSES') || item === 'UPLOADED') {
                    // Recurse into subcategory folders
                    scanDirectory(fullPath, results);
                }
            } else if (item.endsWith('.zip')) {
                // Course archive
                const courseId = item.replace('.zip', '');
                results.push({
                    type: 'archived',
                    courseId: courseId,
                    path: fullPath,
                    hasContent: false
                });
            }
        }
    } catch (error) {
        console.error(`Error scanning ${dirPath}:`, error.message);
    }
    
    return results;
}

/**
 * Categorize course by PRISM relevance
 */
function categorizeCourse(courseId) {
    const categories = [];
    
    for (const [category, prefixes] of Object.entries(PRISM_RELEVANT_PREFIXES)) {
        for (const prefix of prefixes) {
            if (courseId.toLowerCase().startsWith(prefix.toLowerCase())) {
                categories.push(category);
                break;
            }
        }
    }
    
    return categories.length > 0 ? categories : ['other'];
}

/**
 * Extract course metadata from data.json
 */
function extractMetadata(coursePath) {
    const dataJsonPath = path.join(coursePath, 'data.json');
    
    if (!fs.existsSync(dataJsonPath)) {
        return null;
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
        return {
            title: data.title || 'Unknown',
            term: data.term || 'Unknown',
            level: data.level || 'Unknown',
            topics: data.topics || []
        };
    } catch (error) {
        return null;
    }
}

/**
 * Count resources in extracted course
 */
function countResources(coursePath) {
    const counts = {
        pdfs: 0,
        lectures: 0,
        assignments: 0,
        videos: 0
    };
    
    const staticPath = path.join(coursePath, 'static_resources');
    if (fs.existsSync(staticPath)) {
        const files = fs.readdirSync(staticPath);
        counts.pdfs = files.filter(f => f.endsWith('.pdf')).length;
    }
    
    const pagesPath = path.join(coursePath, 'pages');
    if (fs.existsSync(pagesPath)) {
        const lecturesPath = path.join(pagesPath, 'lecture-notes');
        if (fs.existsSync(lecturesPath)) {
            counts.lectures = fs.readdirSync(lecturesPath).length;
        }
        
        const assignmentsPath = path.join(pagesPath, 'assignments');
        if (fs.existsSync(assignmentsPath)) {
            counts.assignments = fs.readdirSync(assignmentsPath).length;
        }
    }
    
    const videoPath = path.join(coursePath, 'video_galleries');
    if (fs.existsSync(videoPath)) {
        counts.videos = 1; // Has video content
    }
    
    return counts;
}

/**
 * Main scanner function
 */
function scanMITCourses() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('PRISM Knowledge Base - MIT Course Scanner');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const courses = scanDirectory(MIT_COURSES_ROOT);
    
    // Categorize and enrich
    const catalog = {
        scanDate: new Date().toISOString(),
        rootPath: MIT_COURSES_ROOT,
        totalCourses: courses.length,
        extracted: 0,
        archived: 0,
        byCategory: {},
        courses: []
    };
    
    for (const course of courses) {
        const categories = categorizeCourse(course.courseId);
        
        let metadata = null;
        let resources = null;
        
        if (course.type === 'extracted') {
            catalog.extracted++;
            metadata = extractMetadata(course.path);
            resources = countResources(course.path);
        } else {
            catalog.archived++;
        }
        
        const enrichedCourse = {
            ...course,
            categories,
            metadata,
            resources,
            prismRelevant: !categories.includes('other')
        };
        
        catalog.courses.push(enrichedCourse);
        
        // Count by category
        for (const cat of categories) {
            if (!catalog.byCategory[cat]) {
                catalog.byCategory[cat] = [];
            }
            catalog.byCategory[cat].push(course.courseId);
        }
    }
    
    // Output summary
    console.log(`Total courses found: ${catalog.totalCourses}`);
    console.log(`  - Extracted: ${catalog.extracted}`);
    console.log(`  - Archived (ZIP): ${catalog.archived}\n`);
    
    console.log('Courses by Category:');
    console.log('────────────────────');
    for (const [cat, ids] of Object.entries(catalog.byCategory)) {
        console.log(`  ${cat}: ${ids.length} courses`);
    }
    
    console.log('\nPRISM-Relevant Courses:');
    console.log('────────────────────────');
    const relevant = catalog.courses.filter(c => c.prismRelevant);
    console.log(`  ${relevant.length} courses relevant to PRISM development\n`);
    
    // Priority courses for extraction
    const priorityCourses = relevant.filter(c => 
        c.categories.includes('algorithms') || 
        c.categories.includes('optimization') ||
        c.categories.includes('manufacturing')
    );
    
    console.log('Priority Courses (algorithms/optimization/manufacturing):');
    console.log('─────────────────────────────────────────────────────────');
    for (const course of priorityCourses.slice(0, 20)) {
        const status = course.type === 'extracted' ? '✓' : '○';
        console.log(`  ${status} ${course.courseId} [${course.categories.join(', ')}]`);
    }
    
    return catalog;
}

// Run scanner
const catalog = scanMITCourses();

// Save catalog
const outputPath = path.join(MIT_COURSES_ROOT, 'PRISM_COURSE_CATALOG.json');
fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2));
console.log(`\nCatalog saved to: ${outputPath}`);
