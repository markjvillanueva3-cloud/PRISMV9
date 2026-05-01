const PRISM_MACHINING_PROCESS_DATABASE = {
    version: "1.0",

    processes: {
        roughing: {
            purpose: "Remove majority of stock material efficiently",
            characteristics: [
                "Requires most horsepower",
                "Significant depths of cut",
                "More aggressive feed rates"
            ],
            guidelines: [
                "Complete all roughing before finishing",
                "Increase speeds/feeds until workpiece shows deficient traits",
                "Watch for part movement in chuck",
                "Understand roughing limitations impact finish operations"
            ]
        },
        semiFinishing: {
            purpose: "Allow better sizing control for tight tolerance features",
            usage: [
                "When tight tolerances required",
                "To pre-qualify specific features",
                "To establish complete profile for single finish tool"
            ]
        },
        finishing: {
            characteristics: [
                "Light depths of cut",
                "Significant RPM increase",
                "Decreased feed per revolution"
            ],
            note: "Often reduce chuck pressure to eliminate workholding marks"
        },
        drilling: {
            types: ["Through hole", "Blind hole", "Access hole"],
            considerations: [
                "Typically preceded by centering",
                "Surface condition affects following operations"
            ]
        },
        boring: {
            purpose: "Create internal cylindrical features",
            characteristics: [
                "Achieves geometrical roundness",
                "Establishes internal size and profile"
            ],
            chipControl: [
                "Internal coolant fed boring bars",
                "Higher coolant pressure",
                "Back flushing chips"
            ]
        },
        threading: {
            guidelines: [
                "Consider pre-roughing thread form with turning tool",
                "Typical speed: 2/3 of general turning surface speed",
                "Limit speed - sharp root angles can burn",
                "Evaluate infeed pattern effect on chips"
            ]
        },
        grooving: {
            purpose: "Create O-ring seats, mating part clearances",
            note: "Many grooving tools can perform limited turning"
        },
        centering: {
            purpose: "Create spotted center for drill point alignment",
            benefit: "Prevents drill walking"
        }
    }
}