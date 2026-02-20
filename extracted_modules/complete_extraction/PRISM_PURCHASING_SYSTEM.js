const PRISM_PURCHASING_SYSTEM = {
    VERSION: "1.0.0",

    // NATIONAL INDUSTRIAL DISTRIBUTORS
    national: {
        msc: {
            name: "MSC Industrial Direct",
            shortName: "MSC",
            type: "Full-Line Industrial Distributor",
            logo: "🏭",
            website: "https://www.mscdirect.com",
            searchUrl: "https://www.mscdirect.com/browse/tn/?searchterm=",
            branchLocator: "https://www.mscdirect.com/branch-locator",
            features: ["Same-Day Shipping", "Technical Support", "Vending", "Tool Management"],
            brands: "All Major Brands",
            specialties: ["Cutting Tools", "Abrasives", "MRO", "Safety"],
            priceLevel: "Competitive",
            accountBenefits: ["Volume Discounts", "Net Terms", "eProcurement"]
        },
        grainger: {
            name: "Grainger",
            shortName: "Grainger",
            type: "MRO & Industrial Supplier",
            logo: "🔧",
            website: "https://www.grainger.com",
            searchUrl: "https://www.grainger.com/search?searchQuery=",
            branchLocator: "https://www.grainger.com/branch",
            features: ["500+ Branches", "Same-Day Pickup", "24/7 Support"],
            brands: "All Major Brands",
            specialties: ["MRO", "Safety", "Facilities", "Some Tooling"],
            priceLevel: "Premium",
            accountBenefits: ["Grainger Choice", "Consignment", "VMI"]
        },
        mcmaster: {
            name: "McMaster-Carr",
            shortName: "McMaster",
            type: "Industrial Hardware Specialist",
            logo: "📦",
            website: "https://www.mcmaster.com",
            searchUrl: "https://www.mcmaster.com/#",
            features: ["Same-Day Shipping", "Huge Selection", "CAD Models"],
            brands: "Premium Selection",
            specialties: ["Hardware", "Raw Materials", "Components", "Tools"],
            priceLevel: "Premium",
            accountBenefits: ["No Minimum Order", "Fast Shipping"]
        },
        travers: {
            name: "Travers Tool Co.",
            shortName: "Travers",
            type: "Cutting Tool Specialist",
            logo: "⚙️",
            website: "https://www.travers.com",
            searchUrl: "https://www.travers.com/search#w=",
            features: ["Tool Specialists", "Technical Support", "Regrinding"],
            brands: "All Major Brands",
            specialties: ["Cutting Tools", "Workholding", "Measurement"],
            priceLevel: "Competitive",
            accountBenefits: ["Volume Pricing", "Credit Terms"]
        },
        kbc: {
            name: "KBC Tools & Machinery",
            shortName: "KBC",
            type: "Industrial Tools & Machinery",
            logo: "🛠️",
            website: "https://www.kbctools.com",
            searchUrl: "https://www.kbctools.com/search?keywords=",
            features: ["Large Selection", "Machinery Sales"],
            brands: "Major Brands + Value Options",
            specialties: ["Cutting Tools", "Machine Accessories", "Shop Equipment"],
            priceLevel: "Value-Competitive",
            accountBenefits: ["Frequent Promotions", "Free Shipping Offers"]
        },
        zoro: {
            name: "Zoro (Grainger Company)",
            shortName: "Zoro",
            type: "Online Industrial Supplier",
            logo: "📋",
            website: "https://www.zoro.com",
            searchUrl: "https://www.zoro.com/search?q=",
            features: ["Online Only", "Free Shipping", "Wide Selection"],
            brands: "Grainger Network",
            specialties: ["MRO", "Tools", "Safety", "Facilities"],
            priceLevel: "Value",
            accountBenefits: ["No Account Required", "Credit Card OK"]
        },
        fastenal: {
            name: "Fastenal",
            shortName: "Fastenal",
            type: "Industrial & Construction Supplies",
            logo: "🔩",
            website: "https://www.fastenal.com",
            searchUrl: "https://www.fastenal.com/products?term=",
            branchLocator: "https://www.fastenal.com/locations",
            features: ["3,300+ Branches", "Vending", "On-Site Solutions"],
            brands: "Fastenal Blue + Major Brands",
            specialties: ["Fasteners", "Safety", "Cutting Tools", "OEM Supply"],
            priceLevel: "Competitive",
            accountBenefits: ["Vending Programs", "VMI", "Bin Stock"]
        },
        pts: {
            name: "Production Tool Supply (PTS)",
            shortName: "PTS",
            type: "Industrial Distribution",
            logo: "🏭",
            website: "https://www.productiontoolsupply.com",
            searchUrl: "https://www.productiontoolsupply.com/search?q=",
            features: ["Midwest Focus", "Technical Support"],
            brands: "Major Industrial Brands",
            specialties: ["Cutting Tools", "Abrasives", "MRO"],
            priceLevel: "Competitive"
        },
        misumi: {
            name: "MISUMI USA",
            shortName: "MISUMI",
            type: "Configurable Components",
            logo: "🇯🇵",
            website: "https://us.misumi-ec.com",
            searchUrl: "https://us.misumi-ec.com/vona2/result/?Keyword=",
            features: ["Configurable Parts", "CAD Downloads", "Fast Delivery"],
            brands: "MISUMI + Selected Brands",
            specialties: ["Automation", "Components", "Die/Mold", "Cutting Tools"],
            priceLevel: "Value",
            accountBenefits: ["Rapid Shipping", "Custom Configurations"]
        },
        globalindustrial: {
            name: "Global Industrial",
            shortName: "Global",
            type: "Industrial Equipment",
            logo: "🌐",
            website: "https://www.globalindustrial.com",
            searchUrl: "https://www.globalindustrial.com/g/search?q=",
            features: ["Equipment Focus", "Wide Selection"],
            brands: "Major Equipment Brands",
            specialties: ["Material Handling", "Shop Equipment", "Storage"],
            priceLevel: "Competitive"
        }
    },
    // SPECIALTY DISTRIBUTORS BY CATEGORY
    specialty: {
        cutting_tools: {
            carbide_depot: {
                name: "Carbide Depot",
                type: "Carbide Insert Specialist",
                website: "https://www.carbidedepot.com",
                specialties: ["Carbide Inserts", "Indexable Tooling"],
                priceLevel: "Value",
                features: ["25+ Years", "Expert Support"]
            },
            tool_holder_exchange: {
                name: "Tool Holder Exchange",
                type: "Toolholding Specialist",
                website: "https://www.toolholderexchange.com",
                specialties: ["Toolholders", "Collets", "Workholding"],
                priceLevel: "Value"
            },
            maritool: {
                name: "Maritool",
                type: "Toolholding Manufacturer",
                website: "https://www.maritool.com",
                specialties: ["ER Collets", "Toolholders", "Made in USA"],
                priceLevel: "Value-Premium"
            },
            lakeshore_carbide: {
                name: "Lakeshore Carbide",
                type: "End Mill Specialist",
                website: "https://www.lakeshorecarbide.com",
                specialties: ["Carbide End Mills", "Made in USA"],
                priceLevel: "Value"
            }
        },
        machine_parts: {
            mro_stop: {
                name: "MROStop.com",
                type: "CNC Parts Specialist",
                website: "https://www.mrostop.com",
                specialties: ["CNC Spare Parts", "Servo Motors", "Drives"],
                priceLevel: "Competitive"
            },
            cnc_parts_dept: {
                name: "CNC Parts Dept",
                type: "CNC Components",
                website: "https://www.cncpartsdept.com",
                specialties: ["Fanuc Parts", "CNC Components"],
                priceLevel: "Value"
            },
            servo_dynamics: {
                name: "Servo Dynamics",
                type: "Servo/Drive Specialist",
                website: "https://www.servodynamics.com",
                specialties: ["Servo Motors", "Drives", "Repairs"],
                priceLevel: "Competitive"
            }
        },
        workholding: {
            carr_lane: {
                name: "Carr Lane Manufacturing",
                type: "Workholding & Fixturing",
                website: "https://www.carrlane.com",
                specialties: ["Fixturing", "Clamps", "Pins", "Locators"],
                priceLevel: "Premium"
            },
            te_co: {
                name: "TE-CO",
                type: "Workholding Components",
                website: "https://www.te-co.com",
                specialties: ["Clamps", "Studs", "Fixturing"],
                priceLevel: "Competitive"
            }
        },
        abrasives: {
            empire_abrasives: {
                name: "Empire Abrasives",
                type: "Grinding Specialist",
                website: "https://www.empireabrasives.com",
                specialties: ["Grinding Wheels", "Abrasives"],
                priceLevel: "Value"
            },
            abrasive_resource: {
                name: "Abrasive Resource",
                type: "Abrasive Products",
                website: "https://www.abrasiveresource.com",
                specialties: ["Belts", "Discs", "Wheels"],
                priceLevel: "Value"
            }
        },
        coolant_fluids: {
            master_fluid: {
                name: "Master Fluid Solutions",
                type: "Metalworking Fluids",
                website: "https://www.masterfluidsolutions.com",
                specialties: ["Coolants", "Cutting Fluids"],
                priceLevel: "Premium"
            },
            koolrite: {
                name: "KOOLRite",
                type: "Coolant Supplier",
                website: "https://www.koolrite.com",
                specialties: ["Synthetic Coolants", "Lubrication"],
                priceLevel: "Competitive"
            }
        }
    },
    // REGIONAL DISTRIBUTORS BY AREA
    regional: {
        northeast: {
            name: "Northeast (NY, NJ, PA, CT, MA, RI, VT, NH, ME)",
            distributors: [
                { name: "J&L Industrial Supply", location: "Southfield, MI (services NE)", website: "jlindustrial.com", specialty: "Full Line" },
                { name: "DGI Supply", location: "Multi-state", website: "dgisupply.com", specialty: "Cutting Tools" },
                { name: "Kennametal Distributor Network", location: "Regional", website: "kennametal.com", specialty: "Cutting Tools" },
                { name: "Bay State Industrial", location: "Massachusetts", website: "baystateindustrial.com", specialty: "Industrial Supplies" }
            ]
        },
        southeast: {
            name: "Southeast (FL, GA, NC, SC, VA, TN, AL, MS, LA)",
            distributors: [
                { name: "Applied Industrial Technologies", location: "Multi-state", website: "applied.com", specialty: "MRO, Bearings" },
                { name: "Motion Industries", location: "Regional", website: "motionindustries.com", specialty: "MRO, Automation" },
                { name: "Southeastern Industrial", location: "Southeast", website: "seindustrial.com", specialty: "Industrial Supplies" }
            ]
        },
        midwest: {
            name: "Midwest (OH, MI, IN, IL, WI, MN, IA, MO, KS, NE)",
            distributors: [
                { name: "Production Tool Supply", location: "Michigan", website: "productiontoolsupply.com", specialty: "Cutting Tools" },
                { name: "Jergens Industrial Supply", location: "Cleveland, OH", website: "jergensindustrial.com", specialty: "Workholding" },
                { name: "Airline Hydraulics", location: "Multi-state", website: "airlinehyd.com", specialty: "Hydraulics, Pneumatics" },
                { name: "Cadillac Machinery", location: "Michigan", website: "cadillacmachinery.com", specialty: "Machinery, Accessories" }
            ]
        },
        southwest: {
            name: "Southwest (TX, AZ, NM, OK, AR)",
            distributors: [
                { name: "Industrial Tooling Supply", location: "Texas", website: "itstexas.com", specialty: "Cutting Tools" },
                { name: "Southwest Industrial Rubber", location: "Texas", website: "swir.com", specialty: "MRO" },
                { name: "Authorized Distributor Network", location: "Regional", website: "Various", specialty: "Various" }
            ]
        },
        west: {
            name: "West Coast (CA, OR, WA, NV, HI)",
            distributors: [
                { name: "All Industrial Tool Supply", location: "California", website: "allindustrial.com", specialty: "Value Tooling" },
                { name: "Pacific Tool & Gauge", location: "West Coast", website: "pacifictoolandgauge.com", specialty: "Precision Tools" },
                { name: "Criterion Machine Works", location: "California", website: "criterionmw.com", specialty: "Boring Tools" }
            ]
        },
        mountain: {
            name: "Mountain (CO, UT, MT, ID, WY)",
            distributors: [
                { name: "Grainger Branches", location: "Regional", website: "grainger.com", specialty: "Full Line" },
                { name: "Fastenal Locations", location: "Regional", website: "fastenal.com", specialty: "Fasteners, Tools" }
            ]
        }
    },
    // MANUFACTURER DIRECT LINKS
    manufacturers: {
        cutting_tools: {
            sandvik: { name: "Sandvik Coromant", url: "https://www.sandvik.coromant.com", search: "https://www.sandvik.coromant.com/en-us/products/pages/productdetails.aspx?searchterm=" },
            kennametal: { name: "Kennametal", url: "https://www.kennametal.com", search: "https://www.kennametal.com/us/en/search.html?q=" },
            iscar: { name: "ISCAR", url: "https://www.iscar.com", search: "https://www.iscar.com/eCatalog/Family.aspx?fnum=" },
            walter: { name: "Walter Tools", url: "https://www.walter-tools.com", search: "https://www.walter-tools.com/en-us/search/pages/default.aspx?q=" },
            seco: { name: "Seco Tools", url: "https://www.secotools.com", search: "https://www.secotools.com/article/searchproducts?q=" },
            mitsubishi: { name: "Mitsubishi Materials", url: "https://www.mitsubishicarbide.com", search: "https://www.mitsubishicarbide.com/" },
            kyocera: { name: "Kyocera SGS", url: "https://www.kyocera-sgstool.com", search: "https://www.kyocera-sgstool.com/" },
            osg: { name: "OSG USA", url: "https://www.osgtool.com", search: "https://www.osgtool.com/Products?search=" },
            guhring: { name: "Guhring", url: "https://www.guhring.com", search: "https://www.guhring.com/Products/Search?term=" },
            harvey: { name: "Harvey Tool", url: "https://www.harveytool.com", search: "https://www.harveytool.com/search?q=" },
            helical: { name: "Helical Solutions", url: "https://www.helicaltool.com", search: "https://www.helicaltool.com/" },
            ingersoll: { name: "Ingersoll Cutting Tools", url: "https://www.ingersoll-imc.com", search: "https://www.ingersoll-imc.com/" },
            horn: { name: "Horn USA", url: "https://www.hornusa.com", search: "https://www.hornusa.com/" },
            sumitomo: { name: "Sumitomo", url: "https://www.sumitool.com", search: "https://www.sumitool.com/" },
            tungaloy: { name: "Tungaloy", url: "https://www.tungaloy.com", search: "https://www.tungaloy.com/" }
        },
        workholding: {
            schunk: { name: "SCHUNK", url: "https://schunk.com", search: "https://schunk.com/us/en/search?query=" },
            rego_fix: { name: "REGO-FIX", url: "https://www.rego-fix.com", search: "https://www.rego-fix.com/" },
            haimer: { name: "HAIMER", url: "https://www.haimer.com", search: "https://www.haimer.com/" },
            big_kaiser: { name: "BIG KAISER", url: "https://www.bigkaiser.com", search: "https://www.bigkaiser.com/" },
            parlec: { name: "Parlec", url: "https://www.parlec.com", search: "https://www.parlec.com/" },
            lyndex_nikken: { name: "Lyndex-Nikken", url: "https://www.lyndexnikken.com", search: "https://www.lyndexnikken.com/" }
        },
        machine_parts: {
            fanuc: { name: "FANUC America", url: "https://www.fanucamerica.com", search: "https://www.fanucamerica.com/" },
            siemens: { name: "Siemens CNC", url: "https://www.siemens.com/cnc", search: "https://www.siemens.com/" },
            mitsubishi_electric: { name: "Mitsubishi Electric", url: "https://us.mitsubishielectric.com", search: "https://us.mitsubishielectric.com/" },
            heidenhain: { name: "HEIDENHAIN", url: "https://www.heidenhain.com", search: "https://www.heidenhain.com/" },
            renishaw: { name: "Renishaw", url: "https://www.renishaw.com", search: "https://www.renishaw.com/" },
            thk: { name: "THK", url: "https://www.thk.com", search: "https://www.thk.com/" },
            nsk: { name: "NSK", url: "https://www.nsk.com", search: "https://www.nsk.com/" },
            skf: { name: "SKF", url: "https://www.skf.com", search: "https://www.skf.com/" }
        }
    },
    // Currently selected item for purchasing
    currentItem: null,
    userRegion: null
}