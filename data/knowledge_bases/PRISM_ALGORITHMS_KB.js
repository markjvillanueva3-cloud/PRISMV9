// PRISM_ALGORITHMS_KB - Lines 810939-813230 (2292 lines) - Algorithms knowledge\n\nconst PRISM_ALGORITHMS_KB = {
    sorting: {
        quicksort: { name: "quicksort", description: "minutes Answer all questions. All questions carry equal marks. Question 1. Show the steps that are involved in sorting the string SORTME using the quicksort algorithm given below. #include <iostream.h> void quicksort(char *a, int l, int r); main() { char str[8] = \"9SORTME\"; // ", source: "1.124j-fall-2000" },
    },
    searching: {
        dfs: { name: "dfs", description: "10 paths/pixel Note: More noise. This is not a coincidence; the integrand has higher variance (the BRDFs are “spikier”). Henrik Wann Jensen Courtesy of Henrik Wann Jensen. Used with permission. 27 Path Tracing Results: Glossy Scene • 100 paths/pixel Henrik Wann Jensen Courtesy of", source: "6.837" },
        a_: { name: "a*", description: "tion of a triangle with vertices {a, b, c} in terms of {α, β, γ}, including possible equality and inequality constraints. P(alpha,beta,gamma) = alpha*a + beta*b + gamma*c, (+1) with alpha+beta+gamma = 1 and alpha,beta,gamma >= 0. (+1) OR P(beta,gamma) = a + beta*(b-a) + gamma*(c-", source: "6.837" },
        binary_search: { name: "binary search", description: "apter 11: I/O ● Chapter 12: Templates ● chapter 14: File processing From algorithms in C++ ● Chapter 9: Quicksort ● Chapter 14: Binary search Problem 1:[40%] In this problem you need to develop a program that can handle user-provided data. You need to write the main() function an", source: "1.124j-fall-2000" },
    },
    graph: {
        prim: { name: "prim", description: "22 Monte Carlo Path Tracing • Trace only one secondary ray per recursion – Otherwise number of rays explodes! • But send many primary rays per pixel (antialiasing) 23 Monte Carlo Path Tracing • Trace only one secondary ray per recursion – Otherwise number of rays explodes! • But ", source: "6.837" },
    },
    optimization: {
        pso: { name: "pso", description: "ity and other nasty details 57 Integration • You know trapezoid, Simpson’s rule, etc. 58 Monte Carlo Integration • Monte Carlo integration: use random samples and compute average – We don’t keep track of spacing between samples – But we kind of hope it will be 1/N on average 59 M", source: "6.837" },
        aco: { name: "aco", description: "87 How to tackle these problems? • Deal with non-linearity: Iterative solution (steepest descent) • Compute Jacobian matrix of world position w.r.t. angles • Jacobian: “If the parameters p change by tiny amounts, what is the resulting change in the world position vWS?” • Then inv", source: "6.837" },
        newton_raphson: { name: "newton-raphson", description: "35 Newton’s Method (1D) • Iterative method for solving non-linear equations • Start from initial guess x0, then iterate • Also called Newton-Raphson iteration 36 Newton’s Method (1D) • Iterative method for solving non-linear equations • Start from initial guess x0, then iterate o", source: "6.837" },
        conjugate_gradient: { name: "conjugate gradient", description: "ds on the adjacent masses’ positions • Makes the system cheaper to solve – Don’t invert the Jacobian! – Use iterative matrix solvers like conjugate gradient, perhaps with preconditioning, etc. © David Baraff and Andrew Witkin. All rights reserved. This content is excluded from ou", source: "6.837" },
        greedy: { name: "greedy", description: "47 Compression algorithm • Approximation: Piecewise linear • Set an error bound • Decide which vertices to keep • Greedy from zero do far © ACM. All rights reserved. This content is excluded from our Creative Commons license. For more information, see http://ocw.mit.edu/help/faq-", source: "6.837" },
        gradient_descent: { name: "gradient descent", description: "he interior and the method is not going to operate. Well, that crudest method would be follow the gradient, but we know from several situations that gradient descent can be less than optimal. So this is more subtle. Well, Newton\'s method actually -- I\'ll explain. So this is act", source: "18.086" },
        simplex: { name: "simplex", description: "d the winning corner. It\'s an interesting competition between two quite different approaches: the famous approach -- so let me write these two. The simplex methods is the best established, best known, approach for solving these problems. What\'s the idea of the simplex method? T", source: "18.086" },
    },
    numerical: {
        finite_element: { name: "finite element", description: "solve it approximately • Monte Carlo techniques use random samples for evaluating the integrals – We’ll look at some simple method in a bit... • Finite element methods discretize the solution using basis functions (again!) – Radiosity, wavelets, precomputed radiance transfer, etc", source: "6.837" },
        monte_carlo: { name: "monte carlo", description: "Global Illumination and Monte Carlo MIT EECS 6.837 Computer Graphics Wojciech Matusik with many slides from Fredo Durand and Jaakko Lehtinen © ACM. All rights reserved. This content is excluded from our Creative Commons license. For more information, see http://ocw.mit.edu/help/f", source: "6.837" },
        jacobi: { name: "jacobi", description: "87 How to tackle these problems? • Deal with non-linearity: Iterative solution (steepest descent) • Compute Jacobian matrix of world position w.r.t. angles • Jacobian: “If the parameters p change by tiny amounts, what is the resulting change in the world position vWS?” • Then inv", source: "6.837" },
        runge_kutta: { name: "runge-kutta", description: "chain. This will require you to implement the diﬀerent kinds of forces (gravity, viscous drag, and springs). We have provided you with a fourth order Runge-Kutta (RK4) integrator, since the integrators you implemented are unstable. 4.1 Forces The core component of particle system", source: "6.837" },
        euler_method: { name: "euler method", description: "ill suﬀer miserably when implementing the trapezoidal rule. 3.1 Refresher on Euler and Trapezoidal Rule The simplest integrator is the explicit Euler method. For an Euler step, given state X, we examine f (X, t) at X, then step to the new state value. This requires to pick a step", source: "6.837" },
        finite_difference: { name: "finite difference", description: "reen-space change dt relates to a texture-space change du,dv. => derivatives, ( du/dt, dv/dt ). e.g. computed by hardware during rasterization often: finite difference (pixels are handled by quads) du, dv dt 54 MIP Indices Actually, you have a choice of ways to translate this der", source: "6.837" },
        fft: { name: "fft", description: "kely that the tradeoffs will come from determining the proper amount of time to spend at each grid. A possible way to do this would be to look at the FFT of the residual, try to predict the spectral content of the error, and adaptively decide which grid to move to based on that r", source: "18.086" },
        singular_value: { name: "singular value", description: "ea to form v transpose v. That is symmetric. It does have positive Eigen values. And those Eigen values, the Eigen values of v transpose v, are the singular values, or rather the singular values squared of v. So I guess I\'m saying, you can\'t trust the Eigen values of v. It\'s t", source: "18.086" },
        gauss_seidel: { name: "gauss-seidel", description: "rested? Why is everybody interested in these vectors? Because actually, that\'s what an iteration like Jacobi produces. If I use Jacobi\'s method, or Gauss-Seidel. Any of those. After one step, 3 I\'ve got b. After two steps, there\'s a multiplication by a in there, right? And so", source: "18.086" },
        cholesky: { name: "cholesky", description: "o). All dead. Write one sentence on what they are known for. Arnoldi Gram Jacobi Schur Cholesky Hadamard Jordan Schwartz Fourier Hankel Kronecker Seidel Frobenius Hessenberg Krylov Toeplitz Gauss Hestenes-Stiefel Lanczos Vandermonde Gershgorin Hilbert Markov Wilkinson Givens Hous", source: "18.086" },
        lu_decomposition: { name: "lu decomposition", description: "ing the original and the reordered K2D matrices. As can be seen from this figure, reordering the matrix produces fewer numbers of nonzeros during the LU decomposition. The Matlab code used to generate Figures 3.1-3.5 was obtained at [3]. Figure 3.2: Graph of the 9 × 9 K2D matrix ", source: "18.086" },
        fast_fourier: { name: "fast fourier", description: "will propose three methods: 1. Elimination in a good order (not using the special structure of K2D) 2. Fast Poisson Solver (applying the FFT = Fast Fourier Transform) 3. Odd-Even Reduction (since K2D is block tridiagonal). The novelty is in the Fast Poisson Solver, which uses the", source: "18.086" },
    },
    geometric: {
        triangulation: { name: "triangulation", description: "ake sense. If your surfaces don’t look right, use the wireframe mode to check whether the normals are pointing outwards and if your triangulation is correct. • Exploit code modularity. B-spline control points can be converted to Bezier control points via a matrix multiplication, ", source: "6.837" },
        convex_hull: { name: "convex hull", description: "A Bézier curve is bounded by the convex hull of its control points. 27 Questions? 28 Why Does the Formula Work? • Explanation 1: – Magic! • Explanation 2: – These are smart weights that describe the influence of each control point • Explanation 3: – It is a linear combination of ", source: "6.837" },
    },
};

const PRISM_SYSTEMS_KB = {
    architecture: {
        pipeline: { name: "pipeline", description: "[ /6] - optimized for latency - latency hiding - extremely long pipeline (1000 stages) Would the following algorithm be implemented in a vertex or pixel shader? [ /8] SSD skinning Phong shading Blend shapes Shadow map query 9 MIT OpenCourseWare http://ocw.mit.edu 6.837 Computer G", source: "6.837" },
        client_server: { name: "client-server", description: "more) 2 6.033 | spring 2018 | Katrina LaCurts File-sharing Techniques client-server CDNs P2P scalability increases (in theory) 3 6.033 | spring 2018 | Katrina LaCurts problem: how do we incentivize peers in a P2P network to upload? 4 6.033 | spring 2018 | Katrina LaCurts Discover", source: "6.033-spring-2018" },
    },
    patterns: {
        strategy: { name: "strategy", description: "oosing appropriate techniques 66 Questions? • Images by Veach and Guibas, SIGGRAPH 95 Naïve sampling strategy Optimal sampling strategy © ACM. All rights reserved. This content is excluded from our Creative Commons license. For more information, see http://ocw.mit.edu/help/faq-fa", source: "6.837" },
        command: { name: "command", description: "66 Hierarchical Modeling in OpenGL • The OpenGL Matrix Stack implements what we just did! • Commands to change current transformation • glTranslate, glScale, etc. • Current transformation is part of the OpenGL state, i.e., all following draw calls will undergo the new transformat", source: "6.837" },
        observer: { name: "observer", description: "Color matching • Color spaces 11 What is Color? Light Object Observer 12 What is Color? Illumination Stimulus Reflectance Cone responses 13 What is Color? Light Object Final stimulus Illumination Reflectance M L Spectral Sensibility S Then the cones in the eye interpret the stimu", source: "6.837" },
        factory: { name: "factory", description: "cillation, physical oscillation like that. So these are methods where we\'re trading off a good shock capture versus a smeared one, which is not satisfactory, really, in a lot of applications. So capturing the shock within 2 delta x, roughly, is highly desirable, and you might ha", source: "18.086" },
        adapter: { name: "adapter", description: "tentPane(contentPane); pack(); setVisible(true); setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE); addWindowListener(new WindowAdapter() { public void windowClosing(WindowEvent e) { dispose(); System.exit(0); } } ); } private void setMenuBar() { menuBar = new JMenuBar()", source: "1.124j-fall-2000" },
    },
    concurrency: {
        lock: { name: "lock", description: "22 Ray Casting vs. Ray Tracing ray from light to hit point is blocked, i.e., X point is in shadow This image is in the public domain. Source: openclipart 23 Ray Casting vs. Ray Tracing • Ray casting = eye rays only, tracing = also secondary Secondary rays are used for X testing s", source: "6.837" },
        atomic: { name: "atomic", description: "particles within the system. evalF should take in a system state and return the derivatives associated with that state. The Integrator methods should atomically modify the system’s state at each step. Implement the simple system and the Euler integrator. Try diﬀerent values of h ", source: "6.837" },
        thread: { name: "thread", description: "d which K_IC is constant. • Optimization Strong substrate for ease of handling Inherent difficulty: 2+ element basis Graded buffers: threading dislocations glide to wafer edge Images removed due to copyright restrictions. Please see Fig. 1 and 3a in [3]. 3.22 Mechanical Behavior ", source: "3.22" },
        deadlock: { name: "deadlock", description: "ads[id].state != RUNNABLE SP = threads[id].sp PTR = threads[id].ptr threads[id].state = RUNNING cpus[CPU].thread = id problem: deadlock (wait() holds t_lock) 16 6.033 | spring 2018 | Katrina LaCurts yield_wait(): // called by wait() id = cpus[CPU].thread threads[id].sp = SP threa", source: "6.033-spring-2018" },
        thread_pool: { name: "thread pool", description: "main thread spawn child threads, via a system call such as fork(). 2.3.2 Crisis and Update Threads Additional threads in the processing unit’s thread pool deal with crisis mode and software up- dates. When a Facilities sta member enables crisis mode on a particular room, a thread", source: "6.033-spring-2018" },
        race_condition: { name: "race condition", description: "g Locks acquire(lock): release(lock): while lock != 0: lock = 0 do nothing lock = 1 problem: race condition (need locks to implement locks!) 21 6.033 | spring 2018 | Katrina LaCurts Implementing Locks acquire(lock): release(lock): do: lock = 0 r <- 1 XCHG r, lock while r == 1 22 ", source: "6.033-spring-2018" },
    },
    distributed: {
        replication: { name: "replication", description: "ampling can use a good filter • Issues – Frequencies above the (super)sampling limit are still aliased • Works well for edges, since spectrum replication is less an issue • Not as well for repetitive textures – But solution soon 34 Uniform supersampling Questions? • Advantage: – ", source: "6.837" },
        raft: { name: "raft", description: "strial and Applied Mathematics. Jaydeep Bardhan and David Willis, two great advisors from Prof. Jacob White’s group. Prof. Gilbert Strang, for his draft of his new textbook. 23", source: "18.086" },
        consensus: { name: "consensus", description: "I, Katrina, give Pete coin 47289 Pete ! Pete idea: get consensus from “enough” of the network — let’s say 51% — before verifying the transaction 12 6.033 | spring 2018 | Katrina LaCurts log log Mark Mark Katrina Katrina log log Pete Pete idea: get consensus from “enough” of the n", source: "6.033-spring-2018" },
    },
};

const PRISM_MFG_STRUCTURES_KB = {
    toolpath: {
        spiral: { name: "spiral", description: "X(t) = rsin(t + k) However, Euler’s method causes the solution to spiral outward, no matter how small h is. After imple­ menting Euler’s method, you should see the single particle spiral outwardly in a 2D space, similar to the image below. 4 Next, implement the Trapezoidal Rule. ", source: "6.837" },
        zigzag: { name: "zigzag", description: ". Your task will be to generate triangles that connect each repetition of the proﬁle curve, as shown in the following image. The basic strategy is to zigzag back and forth between adjacent repetitions to build the triangles. In OpenGL, you are required to specify the vertices in ", source: "6.837" },
        finishing: { name: "finishing", description: "starts by eliminating all the edges of the odd/red nodes (remember that the graph is numbered row by row starting from the bottom left corner). After finishing with the odd nodes, the algorithm continues to eliminate the even nodes until all the edges have been eliminated. A comp", source: "18.086" },
        contour: { name: "contour", description: "n images appear as regions with strong intensity variations. In the case of images obtained with a conventional camera, edges typically represent the contour and/or morphology of the object(s) contained in the field of view (FOV) of the imaging system. From an optics perspective,", source: "18.086" },
        pencil: { name: "pencil", description: "es, which you may never meet. I have never personally met, but it has to be dealt with and there are codes -- I\'ll just mention the code dasil by [? pencil ?] I\'ll finish saying the one word. A model problem here would be some matrix times u prime equal f of u and t, so a sort ", source: "18.086" },
        toolpath: { name: "toolpath", description: "g. 3 • use Mastercam to draw the lathe profile of your paperweight (the top drawing can be done by hand or any software) • use Mastercam to run a toolpath on the profile • prepare for next week\'s lab During Lab II you and your lab mate will: • learn how to use Mastercam Mill • c", source: "2.008-spring-2003" },
        roughing: { name: "roughing", description: "along with the holder dimensions. Parameter screens allow the editing of how the tool is to be used, such as depths of cut and step-over amounts for roughing as well as speed and feed for the tool to use. These are already setup to fairly good values to minimize tool breakage. Pl", source: "2.008-spring-2003" },
    },
    multiaxis: {
        collision: { name: "collision", description: "ith the cloth. You may, for instance, allow the user to click on certain parts of the cloth and drag parts around. • Implement frictionless collisions of cloth with a simple primitive such as a sphere. This is simpler than it may sound at ﬁrst: just check whether a particle is “i", source: "6.837" },
    },
    cutting: {
        material_removal_rate: { name: "material removal rate", description: "a rough estimate. The speciﬁc cutting energy of 4140 is 3.35J/mm 3 . When the machine stalled, the spindle was 540rpm, and t0 = 0.027. Therefore, the material removal rate was M RR = (540 ∗ π ∗ 3) ∗ 0.027 ∗ 0.075 = 10.3008 in3 /min. Since the machine stalled, the power of the mac", source: "2.008-spring-2003" },
        feed_rate: { name: "feed rate", description: "Meaning Address Meaning O program number F feed rate N sequence number E thread lead G preparatory function S spindle speed X, Y, Z coordinate axis motion T tool number R arc/corner radius, or rapid plane M misc./machine functions I absolute center of arc in x-axis J absolute cen", source: "2.008-spring-2003" },
        spindle_speed: { name: "spindle speed", description: "d Z-axes to a predetermined clearance point for changing tools. N1M26T11S2000 Install tool T11 (1.5\" end mill) for facing top surface, spindle speed 2000RPM Rapid positioning mode, designate work coordinate system 1, multi-quadrant circle N2G0G55G75G90X-2.0Y-1.3 mode, absolute p", source: "2.008-spring-2003" },
        tool_life: { name: "tool life", description: "Figure 3: Turned Flange The way that this problem is currently stated makes it really quite diﬃcult. The Taylor equation gives tool life for a speciﬁc speed. However, by ﬁxing ω, the speed changes throughout the turning process, and so the rate of wear changes. One compromise (ap", source: "2.008-spring-2003" },
        taylor_equation: { name: "taylor equation", description: "Figure 3: Turned Flange The way that this problem is currently stated makes it really quite diﬃcult. The Taylor equation gives tool life for a speciﬁc speed. However, by ﬁxing ω, the speed changes throughout the turning process, and so the rate of wear changes. One compromise (ap", source: "2.008-spring-2003" },
    },
};

const PRISM_AI_STRUCTURES_KB = {
    neural: {
        gan: { name: "gan", description: "27 Hierarchical Grouping of Objects • The “scene graph” represents the logical organization of scene scene chair table ground table fruits 6.837 - Durand 28 Scene Graph • Convenient Data structure for scene representation • Geometry (meshes, etc.) • Transformations • Materials, c", source: "6.837" },
        attention: { name: "attention", description: "n rayHit return true if any triangle was hit, false otherwise endif // b) recurse into the children in the right order, paying attention // to handling the case of overlapping nodes correctly ( / 3 ) compute t\'s for both child nodes\' bounding spheres recurse into closer node fi", source: "6.837" },
        neural_network: { name: "neural network", description: "lso tough to justify.) That said, we are not limiting your failure-recovery algorithm. If you want to build an algorithm that works by chaining eight neural networks together and then feeding the output into six di er- ent linear programs, go for it. Just be prepared to justify t", source: "6.033-spring-2018" },
    },
    classical: {
        clustering: { name: "clustering", description: "(19) �max + �min This is the best-known error estimate, although it doesn’t account for any clustering of the eigenvalues of A. It involves only the condition number �max /�min . Prob­ lem gives the “optimal” error estimate but it is not so easy to compute. That optimal estimate ", source: "18.086" },
    },
    probabilistic: {
        hmm: { name: "hmm", description: "ion, see http://ocw.mit.edu/help/faq-fair-use/. 67 Hmmh... • Are uniform samples the best we can do? 68 Smarter Sampling Sample a non-uniform probability Called “importance sampling” Intuitive justification: Sample more in places where there are likely to be larger contributions ", source: "6.837" },
    },
};


// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED SEARCH API - Extensible for Future Data
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_DS_SEARCH = {
    // Knowledge base registry - add new KBs here for extensibility
    kbs: {
        data_structures: PRISM_DATA_STRUCTURES_KB,
        algorithms: PRISM_ALGORITHMS_KB,
        systems: PRISM_SYSTEMS_KB,
        manufacturing: PRISM_MFG_STRUCTURES_KB,
        ai_ml: PRISM_AI_STRUCTURES_KB
    },
    
    // Register new knowledge base (for future data integration)
    registerKB: function(name, kb) {
        this.kbs[name] = kb;
        console.log('[PRISM] Registered KB:', name);
    },
    
    // Search across all knowledge bases
    search: function(query, domains = null) {
        const results = [];
        const q = query.toLowerCase();
        const searchDomains = domains || Object.keys(this.kbs);
        
        for (const domain of searchDomains) {
            const kb = this.kbs[domain];
            if (!kb) continue;
            
            for (const [category, items] of Object.entries(kb)) {
                if (typeof items !== 'object') continue;
                
                for (const [key, item] of Object.entries(items)) {
                    if (!item || typeof item !== 'object') continue;
                    
                    const name = (item.name || '').toLowerCase();
                    const desc = (item.description || '').toLowerCase();
                    
                    if (name.includes(q) || desc.includes(q)) {
                        results.push({
                            domain,
                            category,
                            key,
                            ...item,
                            relevance: name.includes(q) ? 1.0 : 0.5
                        });
                    }
                }
            }
        }
        
        return results.sort((a, b) => b.relevance - a.relevance);
    },
    
    // Get specific item
    get: function(domain, category, key) {
        return this.kbs[domain]?.[category]?.[key] || null;
    },
    
    // List category items
    list: function(domain, category) {
        const cat = this.kbs[domain]?.[category];
        if (!cat) return [];
        return Object.entries(cat).map(([k, v]) => ({ key: k, ...v }));
    },
    
    // Get statistics
    stats: function() {
        const s = {};
        for (const [d, kb] of Object.entries(this.kbs)) {
            s[d] = { _total: 0 };
            for (const [c, items] of Object.entries(kb)) {
                const n = Object.keys(items).length;
                s[d][c] = n;
                s[d]._total += n;
            }
        }
        return s;
    },
    
    // Import additional data (for future integration)
    importData: function(domain, category, items) {
        if (!this.kbs[domain]) {
            this.kbs[domain] = {};
        }
        if (!this.kbs[domain][category]) {
            this.kbs[domain][category] = {};
        }
        
        for (const item of items) {
            const key = item.key || item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            this.kbs[domain][category][key] = item;
        }
        
        console.log('[PRISM] Imported', items.length, 'items to', domain + '/' + category);
    }
};

// Gateway registration
if (typeof PRISM_GATEWAY !== 'undefined') {
    PRISM_GATEWAY.register('kb.ds.search', 'PRISM_DS_SEARCH.search');
    PRISM_GATEWAY.register('kb.ds.get', 'PRISM_DS_SEARCH.get');
    PRISM_GATEWAY.register('kb.ds.list', 'PRISM_DS_SEARCH.list');
    PRISM_GATEWAY.register('kb.ds.stats', 'PRISM_DS_SEARCH.stats');
    PRISM_GATEWAY.register('kb.ds.register', 'PRISM_DS_SEARCH.registerKB');
    PRISM_GATEWAY.register('kb.ds.import', 'PRISM_DS_SEARCH.importData');
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_DATA_STRUCTURES_KB,
        PRISM_ALGORITHMS_KB,
        PRISM_SYSTEMS_KB,
        PRISM_MFG_STRUCTURES_KB,
        PRISM_AI_STRUCTURES_KB,
        PRISM_DS_SEARCH
    };
}

console.log('[PRISM] Data Structures & Systems KB loaded');
console.log('[PRISM] Use PRISM_DS_SEARCH.registerKB() or importData() for future data');

// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTE REGISTRATION FOR KNOWLEDGE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_KNOWLEDGE_INTEGRATION_ROUTES = {
    routes: {
        // ═══════════════════════════════════════════════════════════════════════
        // AI/ML ROUTES (25 new)
        // ═══════════════════════════════════════════════════════════════════════
        
        // Reinforcement Learning
        'ai.rl.sarsa.update': 'PRISM_RL_ENHANCED.SARSA.update',
        'ai.rl.sarsa.episode': 'PRISM_RL_ENHANCED.SARSA.runEpisode',
        'ai.rl.sarsa.initQ': 'PRISM_RL_ENHANCED.SARSA.initQTable',
        'ai.rl.policy_gradient': 'PRISM_RL_ENHANCED.PolicyGradient.update',
        'ai.rl.actor_critic': 'PRISM_RL_ENHANCED.ActorCritic.update',
        'ai.rl.dqn.train': 'PRISM_RL_ENHANCED.DQN.train',
        'ai.rl.value_iteration': 'PRISM_RL_ENHANCED.ValueIteration.solve',
        
        // Neural Network Activations
        'ai.nn.activation.elu': 'PRISM_NN_ENHANCED.Activations.elu',
        'ai.nn.activation.gelu': 'PRISM_NN_ENHANCED.Activations.gelu',
        'ai.nn.activation.selu': 'PRISM_NN_ENHANCED.Activations.selu',
        'ai.nn.activation.swish': 'PRISM_NN_ENHANCED.Activations.swish',
        
        // Optimizers
        'ai.nn.optimizer.sgd': 'PRISM_NN_ENHANCED.Optimizers.sgd',
        'ai.nn.optimizer.adadelta': 'PRISM_NN_ENHANCED.Optimizers.adadelta',
        'ai.nn.optimizer.nadam': 'PRISM_NN_ENHANCED.Optimizers.nadam',
        'ai.nn.optimizer.adamw': 'PRISM_NN_ENHANCED.Optimizers.adamw',
        
        // Clustering
        'ai.cluster.dbscan': 'PRISM_CLUSTERING_ENHANCED.dbscan',
        'ai.cluster.kmedoids': 'PRISM_CLUSTERING_ENHANCED.kMedoids',
        'ai.cluster.tsne': 'PRISM_CLUSTERING_ENHANCED.tsne',
        
        // Signal Processing Enhanced
        'ai.signal.cross_correlation': 'PRISM_SIGNAL_ENHANCED.crossCorrelation',
        'ai.signal.auto_correlation': 'PRISM_SIGNAL_ENHANCED.autoCorrelation',
        
        // Evolutionary
        'ai.moead.optimize': 'PRISM_EVOLUTIONARY_ENHANCED.MOEAD.optimize',
        'ai.ga.elitism': 'PRISM_EVOLUTIONARY_ENHANCED.elitistSelection',
        
        // Explainable AI
        'ai.xai.gradient_saliency': 'PRISM_XAI_ENHANCED.gradientSaliency',
        'ai.xai.integrated_gradients': 'PRISM_XAI_ENHANCED.integratedGradients',
        'ai.xai.lime': 'PRISM_XAI_ENHANCED.lime',
        
        // Attention Mechanisms
        'ai.attention.scaled': 'PRISM_ATTENTION_ADVANCED.scaledDotProductAttention',
        'ai.attention.multihead': 'PRISM_ATTENTION_ADVANCED.multiHeadAttention',
        'ai.attention.sparse': 'PRISM_ATTENTION_ADVANCED.sparseAttention',
        'ai.attention.linear': 'PRISM_ATTENTION_ADVANCED.linearAttention',
        'ai.attention.cross': 'PRISM_ATTENTION_ADVANCED.crossAttention',
        
        // Model Compression
        'ai.compress.quantize': 'PRISM_MODEL_COMPRESSION.quantize',
        'ai.compress.prune': 'PRISM_MODEL_COMPRESSION.prune',
        'ai.compress.distill': 'PRISM_MODEL_COMPRESSION.distill',
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROCESS PLANNING ROUTES (20 new)
        // ═══════════════════════════════════════════════════════════════════════
        
        'plan.search.astar': 'PRISM_PROCESS_PLANNING.aStarSearch',
        'plan.search.bfs': 'PRISM_PROCESS_PLANNING.bfs',
        'plan.search.dfs': 'PRISM_PROCESS_PLANNING.dfs',
        'plan.search.idastar': 'PRISM_PROCESS_PLANNING.idaStar',
        
        'plan.csp.solve': 'PRISM_PROCESS_PLANNING.cspSolver',
        'plan.csp.ac3': 'PRISM_PROCESS_PLANNING.ac3',
        'plan.csp.minconflicts': 'PRISM_PROCESS_PLANNING.minConflicts',
        
        'plan.motion.rrt': 'PRISM_PROCESS_PLANNING.rrt',
        'plan.motion.rrtstar': 'PRISM_PROCESS_PLANNING.rrtStar',
        'plan.motion.prm': 'PRISM_PROCESS_PLANNING.prm',
        
        'plan.hmm.forward': 'PRISM_PROCESS_PLANNING.hmm.forward',
        'plan.hmm.viterbi': 'PRISM_PROCESS_PLANNING.hmm.viterbi',
        'plan.hmm.baumWelch': 'PRISM_PROCESS_PLANNING.hmm.baumWelch',
        
        'plan.mdp.valueIteration': 'PRISM_PROCESS_PLANNING.mdp.valueIteration',
        'plan.mdp.policyIteration': 'PRISM_PROCESS_PLANNING.mdp.policyIteration',
        
        'plan.mcts.search': 'PRISM_PROCESS_PLANNING.mcts',
        
        // ═══════════════════════════════════════════════════════════════════════
        // OPTIMIZATION ROUTES (12 new)
        // ═══════════════════════════════════════════════════════════════════════
        
        'optimize.newton': 'PRISM_OPTIMIZATION.newtonMethod',
        'optimize.steepest': 'PRISM_OPTIMIZATION.steepestDescent',
        'optimize.conjugate': 'PRISM_OPTIMIZATION.conjugateGradient',
        'optimize.bfgs': 'PRISM_OPTIMIZATION.bfgs',
        
        'optimize.penalty': 'PRISM_OPTIMIZATION.penaltyMethod',
        'optimize.barrier': 'PRISM_OPTIMIZATION.barrierMethod',
        'optimize.augmented': 'PRISM_OPTIMIZATION.augmentedLagrangian',
        
        'optimize.ip.branchBound': 'PRISM_OPTIMIZATION.branchAndBound',
        'optimize.ip.cuttingPlane': 'PRISM_OPTIMIZATION.cuttingPlane',
        'optimize.localSearch': 'PRISM_OPTIMIZATION.localSearch',
        'optimize.simulatedAnnealing': 'PRISM_OPTIMIZATION.simulatedAnnealing',
        
        // ═══════════════════════════════════════════════════════════════════════
        // PHYSICS/DYNAMICS ROUTES (15 new)
        // ═══════════════════════════════════════════════════════════════════════
        
        'dynamics.fk.compute': 'PRISM_DYNAMICS.forwardKinematics',
        'dynamics.ik.solve': 'PRISM_DYNAMICS.inverseKinematics',
        'dynamics.jacobian': 'PRISM_DYNAMICS.jacobian',
        'dynamics.singularity': 'PRISM_DYNAMICS.singularityAnalysis',
        
        'dynamics.newtonEuler': 'PRISM_DYNAMICS.newtonEuler',
        'dynamics.lagrangian': 'PRISM_DYNAMICS.lagrangian',
        'dynamics.inertia': 'PRISM_DYNAMICS.inertiaMatrix',
        
        'vibration.modal': 'PRISM_DYNAMICS.modalAnalysis',
        'vibration.stability': 'PRISM_DYNAMICS.stabilityLobes',
        'vibration.frf': 'PRISM_DYNAMICS.frequencyResponse',
        
        'thermal.cutting': 'PRISM_DYNAMICS.cuttingTemperature',
        'thermal.conduction': 'PRISM_DYNAMICS.heatConduction',
        'thermal.convection': 'PRISM_DYNAMICS.convection'
    },
    
    registerAll: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            let registered = 0;
            for (const [route, target] of Object.entries(this.routes)) {
                try {
                    PRISM_GATEWAY.register(route, target);
                    registered++;
                } catch (e) {
                    console.warn(`[KNOWLEDGE] Failed to register route: ${route}`, e);
                }
            }
            console.log(`[KNOWLEDGE_INTEGRATION] Registered ${registered}/${Object.keys(this.routes).length} gateway routes`);
        }
    }
};

// Auto-register if GATEWAY exists
if (typeof PRISM_GATEWAY !== 'undefined') {
    PRISM_KNOWLEDGE_INTEGRATION_ROUTES.registerAll();
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI LEARNING PIPELINE CONNECTORS
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_KNOWLEDGE_AI_CONNECTOR = {
    /**
     * Connect all knowledge modules to AI learning pipeline
     */
    connectToLearning: function() {
        if (typeof PRISM_AI_LEARNING_PIPELINE === 'undefined') {
            console.warn('[KNOWLEDGE] AI Learning Pipeline not available');
            return;
        }
        
        // Subscribe to planning events
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.subscribe('plan:complete', (result) => {
                PRISM_AI_LEARNING_PIPELINE.recordOutcome({
                    recommendationType: 'process_plan',
                    recommended: result.plan,
                    algorithms_used: result.algorithmsUsed || ['A*', 'CSP'],
                    knowledge_sources: ['MIT_16.410', 'MIT_16.412j']
                });
            });
            
            PRISM_EVENT_BUS.subscribe('optimize:complete', (result) => {
                PRISM_AI_LEARNING_PIPELINE.recordOutcome({
                    recommendationType: 'optimization',
                    recommended: result.solution,
                    algorithms_used: result.method || ['Newton'],
                    knowledge_sources: ['MIT_15.084j', 'MIT_6.251J']
                });
            });
            
            PRISM_EVENT_BUS.subscribe('dynamics:analysis', (result) => {
                PRISM_AI_LEARNING_PIPELINE.recordOutcome({
                    recommendationType: 'dynamics_analysis',
                    recommended: result.analysis,
                    algorithms_used: result.methods || ['Modal', 'FFT'],
                    knowledge_sources: ['MIT_16.07', 'MIT_2.004']
                });
            });
        }
        
        console.log('[KNOWLEDGE_AI_CONNECTOR] Connected to AI Learning Pipeline');
    },
    
    /**
     * Generate training data from knowledge modules
     */
    generateTrainingData: function(module, samples = 1000) {
        const data = [];
        
        switch(module) {
            case 'optimization':
                // Generate optimization training samples
                for (let i = 0; i < samples; i++) {
                    const x = (Math.random() - 0.5) * 20;
                    const y = (Math.random() - 0.5) * 20;
                    data.push({
                        input: [x, y],
                        output: [x*x + y*y, 2*x, 2*y] // Function value, gradients
                    });
                }
                break;
                
            case 'dynamics':
                // Generate kinematics training samples
                for (let i = 0; i < samples; i++) {
                    const q = [
                        Math.random() * Math.PI * 2 - Math.PI,
                        Math.random() * Math.PI * 2 - Math.PI,
                        Math.random() * Math.PI * 2 - Math.PI
                    ];
                    // Simplified forward kinematics output
                    data.push({
                        input: q,
                        output: [Math.cos(q[0]) + Math.cos(q[1]), Math.sin(q[0]) + Math.sin(q[1]), q[2]]
                    });
                }
                break;
                
            case 'signal':
                // Generate signal processing training samples
                for (let i = 0; i < samples; i++) {
                    const signal = Array(64).fill(0).map(() => Math.random() * 2 - 1);
                    // Add some pattern
                    const freq = Math.floor(Math.random() * 10) + 1;
                    for (let j = 0; j < 64; j++) {
                        signal[j] += Math.sin(2 * Math.PI * freq * j / 64);
                    }
                    data.push({
                        input: signal,
                        output: [freq, Math.max(...signal), Math.min(...signal)]
                    });
                }
                break;
                
            default:
                console.warn(`Unknown module for training data: ${module}`);
        }
        
        return data;
    }
};

// Initialize connectors on load
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            PRISM_KNOWLEDGE_AI_CONNECTOR.connectToLearning();
        }, 1000);
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE INTEGRATION SELF-TESTS
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_KNOWLEDGE_INTEGRATION_TESTS = {
    runAll: function() {
        console.log('[KNOWLEDGE_TESTS] Running integration tests...');
        const results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        
        // Test 1: AI/ML modules loaded
        try {
            const hasRL = typeof PRISM_RL_ENHANCED !== 'undefined';
            const hasNN = typeof PRISM_NN_ENHANCED !== 'undefined';
            const hasCluster = typeof PRISM_CLUSTERING_ENHANCED !== 'undefined';
            const hasAttention = typeof PRISM_ATTENTION_ADVANCED !== 'undefined';
            
            if (hasRL && hasNN && hasCluster && hasAttention) {
                results.passed++;
                results.tests.push({ name: 'AI/ML Modules', status: 'PASS' });
            } else {
                throw new Error('Missing AI/ML modules');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'AI/ML Modules', status: 'FAIL', error: e.message });
        }
        
        // Test 2: Process Planning loaded
        try {
            if (typeof PRISM_PROCESS_PLANNING !== 'undefined' && 
                typeof PRISM_PROCESS_PLANNING.aStarSearch === 'function') {
                results.passed++;
                results.tests.push({ name: 'Process Planning', status: 'PASS' });
            } else {
                throw new Error('PRISM_PROCESS_PLANNING not loaded');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Process Planning', status: 'FAIL', error: e.message });
        }
        
        // Test 3: Optimization loaded
        try {
            if (typeof PRISM_OPTIMIZATION !== 'undefined' &&
                typeof PRISM_OPTIMIZATION.newtonMethod === 'function') {
                results.passed++;
                results.tests.push({ name: 'Optimization', status: 'PASS' });
            } else {
                throw new Error('PRISM_OPTIMIZATION not loaded');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Optimization', status: 'FAIL', error: e.message });
        }
        
        // Test 4: Gateway routes registered
        try {
            if (typeof PRISM_GATEWAY !== 'undefined') {
                const testRoutes = ['plan.search.astar', 'ai.cluster.dbscan', 'optimize.newton'];
                let found = 0;
                for (const route of testRoutes) {
                    if (PRISM_GATEWAY.routes[route]) found++;
                }
                if (found === testRoutes.length) {
                    results.passed++;
                    results.tests.push({ name: 'Gateway Routes', status: 'PASS' });
                } else {
                    throw new Error(`Only ${found}/${testRoutes.length} routes found`);
                }
            } else {
                throw new Error('PRISM_GATEWAY not available');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Gateway Routes', status: 'FAIL', error: e.message });
        }
        
        // Test 5: A* Search functional test
        try {
            const problem = {
                initial: { x: 0, y: 0 },
                isGoal: (state) => state.x === 2 && state.y === 2,
                heuristic: (state) => Math.abs(2 - state.x) + Math.abs(2 - state.y),
                getSuccessors: (state) => [
                    { state: { x: state.x + 1, y: state.y }, action: 'right', cost: 1 },
                    { state: { x: state.x, y: state.y + 1 }, action: 'up', cost: 1 }
                ].filter(s => s.state.x <= 2 && s.state.y <= 2)
            };
            const result = PRISM_PROCESS_PLANNING.aStarSearch(problem);
            if (result.found && result.totalCost === 4) {
                results.passed++;
                results.tests.push({ name: 'A* Search Test', status: 'PASS' });
            } else {
                throw new Error('A* returned incorrect result');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'A* Search Test', status: 'FAIL', error: e.message });
        }
        
        // Print results
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`[KNOWLEDGE_TESTS] Results: ${results.passed}/${results.passed + results.failed} passed`);
        results.tests.forEach(t => {
            console.log(`  ${t.status === 'PASS' ? '✅' : '❌'} ${t.name}: ${t.status}${t.error ? ' - ' + t.error : ''}`);
        });
        console.log('═══════════════════════════════════════════════════════════');
        
        return results;
    }
};

// Export for testing
if (typeof window !== 'undefined') {
    window.PRISM_KNOWLEDGE_INTEGRATION_TESTS = PRISM_KNOWLEDGE_INTEGRATION_TESTS;
}

console.log('[PRISM] Knowledge Integration v1.0 loaded - 34,000+ lines from 107+ courses');

const PRISM_CATALOG_FINAL = {
    version: '1.0.0',
    generated: '2026-01-17',
    description: 'Complete manufacturer catalog integration from 44 PDFs',
    totalManufacturers: 25,
    totalLines: 9500,
    
    // ═══════════════════════════════════════════════════════════════
    // BATCH 1: TOOL HOLDERS (v1)
    // ═══════════════════════════════════════════════════════════════
    toolHolders: {
        
        // ─────────────────────────────────────────────────────────────────────
        // GUHRING HYDRAULIC CHUCKS
        // Source: guhring tool holders.pdf (6 pages)
        // ─────────────────────────────────────────────────────────────────────
        guhring: {
            brand: 'Guhring',
            country: 'Germany',
            website: 'www.guhring.com',
            
            hydraulicChucks: {
                description: 'High-precision hydraulic chucks with increased clamping force',
                features: [
                    'Max 3μm concentricity deviation',
                    'Fast and simple tool change',
                    'Vibration cushioning effect',
                    'Optimal tool life and surface quality'
                ],
                specifications: [
                    { clampingDia: 6, maxRpm: 50000, maxTorque: 16, minInsertionDepth: 27, maxAdjustment: 10, maxRadialForce: 225, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 8, maxRpm: 50000, maxTorque: 26, minInsertionDepth: 27, maxAdjustment: 10, maxRadialForce: 370, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 10, maxRpm: 50000, maxTorque: 50, minInsertionDepth: 31, maxAdjustment: 10, maxRadialForce: 540, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 12, maxRpm: 50000, maxTorque: 82, minInsertionDepth: 36, maxAdjustment: 10, maxRadialForce: 650, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 14, maxRpm: 50000, maxTorque: 125, minInsertionDepth: 36, maxAdjustment: 10, maxRadialForce: 900, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 16, maxRpm: 50000, maxTorque: 190, minInsertionDepth: 39, maxAdjustment: 10, maxRadialForce: 1410, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 18, maxRpm: 50000, maxTorque: 275, minInsertionDepth: 39, maxAdjustment: 10, maxRadialForce: 1580, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 20, maxRpm: 50000, maxTorque: 310, minInsertionDepth: 41, maxAdjustment: 10, maxRadialForce: 1860, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 25, maxRpm: 25000, maxTorque: 520, minInsertionDepth: 47, maxAdjustment: 10, maxRadialForce: 4400, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 32, maxRpm: 25000, maxTorque: 770, minInsertionDepth: 51, maxAdjustment: 10, maxRadialForce: 6500, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' }
                ]
            },
            
            catHydraulicHolders: {
                seriesNumber: '4216',
                balanceQuality: 'G6.3 at 15,000 RPM',
                taperStandard: 'ANSI/ASME B 5.50',
                coolant: 'Through center and flange',
                retentionKnob: { CAT40: '5/8-11', CAT50: '1-8' },
                models: [
                    // CAT40 Inch
                    { taper: 'CAT40', clampingDia: '1/4"', clampingDiaMm: 6.35, d2: 26.0, d4: 44.5, l1: 64.0, l2: 37.0, l5: 29.5, edp: '9042161060400' },
                    { taper: 'CAT40', clampingDia: '3/8"', clampingDiaMm: 9.525, d2: 30.0, d4: 44.5, l1: 64.0, l2: 41.0, l5: 31.0, edp: '9042161090400' },
                    { taper: 'CAT40', clampingDia: '1/2"', clampingDiaMm: 12.7, d2: 32.0, d4: 44.5, l1: 64.0, l2: 46.0, l5: 31.5, edp: '9042161120400' },
                    { taper: 'CAT40', clampingDia: '5/8"', clampingDiaMm: 15.875, d2: 38.0, d4: 44.5, l1: 64.0, l2: 49.0, l5: 33.0, edp: '9042161150400' },
                    { taper: 'CAT40', clampingDia: '3/4"', clampingDiaMm: 19.05, d2: 40.0, d4: 44.5, l1: 64.0, l2: 49.0, l5: 33.0, edp: '9042161190400' },
                    { taper: 'CAT40', clampingDia: '1"', clampingDiaMm: 25.4, d2: 49.5, d4: 44.5, l1: 81.0, l2: 57.0, l5: 40.0, edp: '9042161250400' },
                    { taper: 'CAT40', clampingDia: '1-1/4"', clampingDiaMm: 31.75, d2: 63.0, d4: 80.0, l1: 81.0, l2: 61.0, l5: 25.5, edp: '9042161310400' },
                    // CAT50 Inch
                    { taper: 'CAT50', clampingDia: '1/4"', clampingDiaMm: 6.35, d2: 26.0, d4: 69.9, l1: 81.0, l2: 37.0, l5: 29.5, edp: '9042161060500' },
                    { taper: 'CAT50', clampingDia: '3/8"', clampingDiaMm: 9.525, d2: 30.0, d4: 69.9, l1: 81.0, l2: 41.0, l5: 31.0, edp: '9042161090500' },
                    { taper: 'CAT50', clampingDia: '1/2"', clampingDiaMm: 12.7, d2: 32.0, d4: 69.9, l1: 81.0, l2: 46.0, l5: 31.5, edp: '9042161120500' },
                    { taper: 'CAT50', clampingDia: '5/8"', clampingDiaMm: 15.875, d2: 38.0, d4: 69.9, l1: 81.0, l2: 49.0, l5: 33.0, edp: '9042161150500' },
                    { taper: 'CAT50', clampingDia: '3/4"', clampingDiaMm: 19.05, d2: 40.0, d4: 69.9, l1: 81.0, l2: 49.0, l5: 33.0, edp: '9042161190500' },
                    { taper: 'CAT50', clampingDia: '1"', clampingDiaMm: 25.4, d2: 57.0, d4: 69.9, l1: 81.0, l2: 57.0, l5: 40.0, edp: '9042161250500' },
                    { taper: 'CAT50', clampingDia: '1-1/4"', clampingDiaMm: 31.75, d2: 63.0, d4: 69.9, l1: 81.0, l2: 61.0, l5: 45.0, edp: '9042161310500' },
                    // CAT40 Metric
                    { taper: 'CAT40', clampingDia: '6mm', clampingDiaMm: 6, d2: 26.0, d4: 44.5, l1: 64.0, l2: 37.0, l5: 29.5, edp: '9042160060400' },
                    { taper: 'CAT40', clampingDia: '8mm', clampingDiaMm: 8, d2: 28.0, d4: 44.5, l1: 64.0, l2: 37.0, l5: 30.0, edp: '9042160080400' },
                    { taper: 'CAT40', clampingDia: '10mm', clampingDiaMm: 10, d2: 30.0, d4: 44.5, l1: 64.0, l2: 41.0, l5: 31.0, edp: '9042160100400' },
                    { taper: 'CAT40', clampingDia: '12mm', clampingDiaMm: 12, d2: 32.0, d4: 44.5, l1: 64.0, l2: 46.0, l5: 31.5, edp: '9042160120400' },
                    { taper: 'CAT40', clampingDia: '14mm', clampingDiaMm: 14, d2: 34.0, d4: 44.5, l1: 64.0, l2: 46.0, l5: 31.5, edp: '9042160140400' },
                    { taper: 'CAT40', clampingDia: '16mm', clampingDiaMm: 16, d2: 38.0, d4: 44.5, l1: 64.0, l2: 49.0, l5: 33.0, edp: '9042160160400' },
                    { taper: 'CAT40', clampingDia: '18mm', clampingDiaMm: 18, d2: 40.0, d4: 44.5, l1: 64.0, l2: 49.0, l5: 33.0, edp: '9042160180400' },
                    { taper: 'CAT40', clampingDia: '20mm', clampingDiaMm: 20, d2: 42.0, d4: 44.5, l1: 64.0, l2: 51.0, l5: 34.0, edp: '9042160200400' },
                    { taper: 'CAT40', clampingDia: '25mm', clampingDiaMm: 25, d2: 49.5, d4: 44.5, l1: 81.0, l2: 57.0, l5: 40.0, edp: '9042160250400' },
                    { taper: 'CAT40', clampingDia: '32mm', clampingDiaMm: 32, d2: 63.0, d4: 80.0, l1: 81.0, l2: 61.0, l5: 25.5, edp: '9042160320400' }
                ]
            },
            
            catShrinkFitHolders: {
                seriesNumber: '4764',
                balanceQuality: 'G6.3 at 15,000 RPM',
                balancingThreads: '4x M6 / 6x M6',
                features: ['Axial force dampening set screw', 'Perfect runout accuracy'],
                models: [
                    { taper: 'CAT40', clampingDia: '1/4"', d2: 21.0, d4: 27.0, l1: 80.0, l2: 36.0, edp: '9047641060400' },
                    { taper: 'CAT40', clampingDia: '3/8"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 41.0, edp: '9047641090400' },
                    { taper: 'CAT40', clampingDia: '1/2"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 46.0, edp: '9047641120400' },
                    { taper: 'CAT40', clampingDia: '5/8"', d2: 27.0, d4: 34.0, l1: 80.0, l2: 49.0, edp: '9047641150400' },
                    { taper: 'CAT40', clampingDia: '3/4"', d2: 33.0, d4: 42.0, l1: 80.0, l2: 49.0, edp: '9047641190400' },
                    { taper: 'CAT40', clampingDia: '1"', d2: 44.0, d4: 53.0, l1: 100.0, l2: 57.0, edp: '9047641250400' },
                    { taper: 'CAT40', clampingDia: '1-1/4"', d2: 44.0, d4: 53.0, l1: 100.0, l2: 61.0, edp: '9047641310400' }
                ]
            },
            
            guhrojetShrinkFit: {
                seriesNumber: '4765',
                description: 'Optimized cooling for tools without internal coolant ducts',
                features: ['Good chip evacuation', 'Increased process reliability'],
                models: [
                    { taper: 'CAT40', clampingDia: '1/4"', d2: 21.0, d4: 27.0, l1: 80.0, l2: 36.0, edp: '9047651060400' },
                    { taper: 'CAT40', clampingDia: '3/8"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 41.0, edp: '9047651090400' },
                    { taper: 'CAT40', clampingDia: '1/2"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 46.0, edp: '9047651120400' },
                    { taper: 'CAT40', clampingDia: '5/8"', d2: 27.0, d4: 34.0, l1: 80.0, l2: 49.0, edp: '9047651150400' },
                    { taper: 'CAT40', clampingDia: '3/4"', d2: 33.0, d4: 42.0, l1: 80.0, l2: 49.0, edp: '9047651190400' },
                    { taper: 'CAT50', clampingDia: '3/8"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 41.0, edp: '9047651090500' },
                    { taper: 'CAT50', clampingDia: '1/2"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 46.0, edp: '9047651120500' },
                    { taper: 'CAT50', clampingDia: '3/4"', d2: 33.0, d4: 42.0, l1: 80.0, l2: 49.0, edp: '9047651190500' },
                    { taper: 'CAT50', clampingDia: '1"', d2: 44.0, d4: 53.0, l1: 100.0, l2: 57.0, edp: '9047651250500' }
                ]
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // BIG DAISHOWA TOOL HOLDERS
        // Source: BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf (628 pages)
        // ─────────────────────────────────────────────────────────────────────
        bigDaishowa: {
            brand: 'BIG DAISHOWA',
            country: 'Japan',
            website: 'www.bigdaishowa.com',
            
            bigPlusSystem: {
                description: 'Dual contact spindle system for highest precision',
                benefits: [
                    'ATC repeatability within 1μm',
                    'Minimized deflection',
                    'Maximum machining accuracy',
                    'Superior surface finish'
                ],
                pullingForce: '800kg',
                deflectionReduction: 'Significantly reduced vs conventional'
            },
            
            megaChucks: {
                megaMicroChuck: {
                    description: 'For micro drill & end mill applications',
                    maxRpm: 38000,
                    clampingRange: { min: 0.018, max: 0.317, minMm: 0.45, maxMm: 8.05, unit: 'inch' },
                    models: [
                        { taper: 'HSK-A40', clampingRange: '0.018-0.128"', bodyDia: 0.394, length: 2.36, maxRpm: 30000, collet: 'NBC3S', weight: 0.6 },
                        { taper: 'HSK-A40', clampingRange: '0.018-0.159"', bodyDia: 0.472, length: 2.36, maxRpm: 30000, collet: 'NBC4S', weight: 0.6 },
                        { taper: 'HSK-A40', clampingRange: '0.018-0.238"', bodyDia: 0.551, length: 2.36, maxRpm: 30000, collet: 'NBC6S', weight: 0.6 },
                        { taper: 'HSK-A50', clampingRange: '0.018-0.159"', bodyDia: 0.472, length: 2.95, maxRpm: 30000, collet: 'NBC4S', weight: 1.1 },
                        { taper: 'HSK-A63', clampingRange: '0.018-0.159"', bodyDia: 0.472, length: 2.95, maxRpm: 30000, collet: 'NBC4S', weight: 1.8 },
                        { taper: 'HSK-A63', clampingRange: '0.116-0.317"', bodyDia: 0.709, length: 3.54, maxRpm: 30000, collet: 'NBC8S', weight: 2.0 }
                    ]
                },
                
                megaEChuck: {
                    description: 'Collet chuck for end milling up to ø0.500" with high concentricity & rigidity',
                    maxRpm: 40000,
                    clampingRange: { min: 0.125, max: 0.500, minMm: 3, maxMm: 12, unit: 'inch' },
                    runout: { guaranteed: 0.00004, atNose: 0.00004, atTestBar: 0.00012, unit: 'inch' },
                    maxCoolantPressure: 1000, // PSI
                    features: [
                        '100% concentricity inspection',
                        'Runout within 1μm at nose guaranteed',
                        'Sealed collet nut for reliable coolant',
                        'Extended gripping length',
                        'Thick body eliminates chatter and deflection'
                    ]
                },
                
                megaSynchro: {
                    description: 'Tapping holder that compensates for synchronization errors',
                    thrustLoadReduction: { withColletChuck: 165, withMegaSynchro: 13.2, unit: 'lbs', reduction: '90%' },
                    tappingRanges: {
                        MGT3: { ansi: 'No.0-No.6', metric: 'M1-M3' },
                        MGT36: { ansi: 'AU13/16-AU1-1/2', metric: 'M20-M36' }
                    },
                    benefits: [
                        'Minimized thrust load',
                        'Improved thread quality',
                        'Extended tap life',
                        'Fine surface finish'
                    ]
                }
            },
            
            shrinkFitHolders: {
                slimJetThrough: {
                    description: 'Coolant securely supplied to cutting edge periphery from chuck nose',
                    clampingRange: { min: 0.236, max: 0.472, unit: 'inch' },
                    models: [
                        { taper: 'BBT40', clampingDia: 0.236, bodyDia: 0.630, bodDia1: 1.26, length: 4.13, minClampLength: 2.17, weight: 2.9 },
                        { taper: 'BBT40', clampingDia: 0.315, bodyDia: 0.748, bodDia1: 1.38, length: 4.13, minClampLength: 2.17, weight: 2.9 },
                        { taper: 'BBT40', clampingDia: 0.394, bodyDia: 0.866, bodDia1: 1.50, length: 4.13, minClampLength: 2.28, weight: 3.1 },
                        { taper: 'BBT40', clampingDia: 0.472, bodyDia: 0.945, bodDia1: 1.57, length: 4.13, minClampLength: 2.48, weight: 3.1 },
                        { taper: 'BBT50', clampingDia: 0.236, bodyDia: 0.630, bodDia1: 1.65, length: 6.50, minClampLength: 3.66, weight: 9.0 },
                        { taper: 'BBT50', clampingDia: 0.315, bodyDia: 0.748, bodDia1: 1.77, length: 6.50, minClampLength: 3.90, weight: 9.3 },
                        { taper: 'BBT50', clampingDia: 0.394, bodyDia: 0.866, bodDia1: 1.89, length: 6.50, minClampLength: 4.06, weight: 9.5 },
                        { taper: 'BBT50', clampingDia: 0.472, bodyDia: 0.945, bodDia1: 1.97, length: 6.50, minClampLength: 4.25, weight: 9.5 }
                    ]
                }
            },
            
            angleHeads: {
                ag90TwinHead: {
                    description: 'Compact design for symmetrical machining',
                    maxRpm: 6000,
                    clampingRange: { min: 0.059, max: 0.394, unit: 'inch' },
                    speedRatio: '1:1',
                    rotationDirection: 'Reverse of spindle',
                    models: [
                        { taper: 'BCV40', collet: 'NBC10', weight: 13.9 },
                        { taper: 'BCV50', collet: 'NBC10', weight: 30.4 }
                    ]
                }
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // HAIMER TOOL HOLDERS
        // Source: Haimer USA Master Catalog.pdf (862 pages)
        // ─────────────────────────────────────────────────────────────────────
        haimer: {
            brand: 'HAIMER',
            country: 'Germany',
            website: 'www.haimer.com',
            production: {
                facility: 'Motzenhofen, Germany',
                space: '47,000 ft²',
                capacity: '4,000 tool holders per day',
                claim: 'Largest production facility for rotating tool holders worldwide'
            },
            
            safeLockSystem: {
                description: 'Pull out protection for high performance cutting',
                features: [
                    'Prevents micro-creeping in HPC',
                    'Form fit connection via grooves',
                    'High torque transmission',
                    'No tool pull out',
                    'No twisting'
                ],
                patented: true
            },
            
            holderTypes: {
                shrinkFit: {
                    runout: 0.00012, // inch at 3xD
                    balanceQuality: 'G2.5 at 25,000 RPM',
                    features: ['Symmetric clamping', 'High rigidity', 'Excellent damping']
                },
                colletChuck: {
                    runout: 0.0002, // inch
                    clampingRange: 'ER8 to ER50'
                },
                hydraulic: {
                    runout: 0.0001, // inch
                    coolantPressure: 'Up to 1500 PSI',
                    features: ['Oil-activated clamping', 'Excellent damping']
                }
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 2: WORKHOLDING
    // ═══════════════════════════════════════════════════════════════════════════
    
    workholding: {
        
        // ─────────────────────────────────────────────────────────────────────
        // ORANGE VISE
        // Source: 543f80b8_2016_orange_vise_catalog.pdf (10 pages)
        // ─────────────────────────────────────────────────────────────────────
        orangeVise: {
            brand: 'Orange Vise',
            country: 'USA',
            website: 'www.orangevise.com',
            madeIn: '100% Made in USA',
            warranty: 'Lifetime warranty against defects',
            
            features: [
                'Ball Coupler ready zero-point system',
                'CarveSmart IJS dovetailed jaw interface',
                'Quick-change jaw plates',
                'Dual station convertible to single',
                'No thrust bearings (reliability)',
                'Sealed main screw threads'
            ],
            
            ballCouplers: {
                holdingForce: 10000, // lbs per coupler
                locatingRepeatability: 0.0005, // inch or better
                actuation: ['Manual', 'Pneumatic from above', 'Pneumatic from below']
            },
            
            vises: {
                sixInchDualStation: [
                    {
                        model: 'OV6-200DS3',
                        sku: '100-101',
                        description: '6" x 20.0" Dual Station Vise',
                        jawWidth: 6.0,
                        overallLength: 20.0,
                        maxOpeningWithPlates: { dualLaydown: 4.25, dualWide: 3.0, singleStation: 10.5 },
                        maxOpeningWithoutPlates: { dualLaydown: 5.0, dualWide: 4.5, singleStation: 12.0 },
                        maxClampingForce: 10000,
                        clampingRatio: '825 lbs per 10 lbs-ft torque',
                        shippingWeight: 112,
                        bodyMaterial: 'Cast Iron',
                        price: 1999
                    },
                    {
                        model: 'OV6-175DS3',
                        sku: '100-102',
                        description: '6" x 17.5" Dual Station Vise',
                        jawWidth: 6.0,
                        overallLength: 17.5,
                        maxOpeningWithPlates: { dualLaydown: 3.0, dualWide: 1.75, singleStation: 8.0 },
                        maxOpeningWithoutPlates: { dualLaydown: 3.75, dualWide: 3.25, singleStation: 9.5 },
                        maxClampingForce: 10000,
                        shippingWeight: 106,
                        bodyMaterial: 'Cast Iron',
                        price: 1999
                    },
                    {
                        model: 'OV6-160DS3',
                        sku: '100-103',
                        description: '6" x 16.0" Dual Station Vise',
                        jawWidth: 6.0,
                        overallLength: 16.0,
                        maxOpeningWithPlates: { dualLaydown: 1.5, singleStation: 6.5 },
                        maxOpeningWithoutPlates: { dualLaydown: 2.25, singleStation: 8.0 },
                        maxClampingForce: 10000,
                        shippingWeight: 88,
                        bodyMaterial: 'Cast Iron',
                        price: 1999
                    }
                ],
                
                fourFiveInchDualStation: [
                    {
                        model: 'OV45-200DS3',
                        sku: '100-201',
                        description: '4.5" x 20.0" Dual Station Vise',
                        jawWidth: 4.5,
                        overallLength: 20.0,
                        maxClampingForce: 10000,
                        shippingWeight: 84,
                        bodyMaterial: '17-4 Stainless Steel',
                        price: 1799
                    },
                    {
                        model: 'OV45-175DS3',
                        sku: '100-202',
                        description: '4.5" x 17.5" Dual Station Vise',
                        jawWidth: 4.5,
                        overallLength: 17.5,
                        maxClampingForce: 10000,
                        shippingWeight: 80,
                        bodyMaterial: '17-4 Stainless Steel',
                        price: 1799
                    },
                    {
                        model: 'OV45-160DS3',
                        sku: '100-203',
                        description: '4.5" x 16.0" Dual Station Vise',
                        jawWidth: 4.5,
                        overallLength: 16.0,
                        maxClampingForce: 10000,
                        shippingWeight: 66,
                        bodyMaterial: '17-4 Stainless Steel',
                        price: 1799
                    },
                    {
                        model: 'OV45-160SS3',
                        sku: '100-204',
                        description: '4.5" x 16.0" Single Station Vise',
                        jawWidth: 4.5,
                        overallLength: 16.0,
                        maxOpeningWithPlates: 8.0,
                        maxOpeningWithoutPlates: 9.5,
                        maxClampingForce: 10000,
                        shippingWeight: 66,
                        bodyMaterial: '17-4 Stainless Steel',
                        price: 999
                    }
                ],
                
                specifications: {
                    fixedJawMountingScrew: '1/2"-13 x 2.25" BHCS',
                    fixedJawTorque: 30, // lbs-ft
                    slidingJawSetScrew: '1/2"-13 x 1.25"',
                    slidingJawTorque: 10, // lbs-ft
                    jawPlateScrew: '1/2"-13 LHCS',
                    jawPlateTorque: 20, // lbs-ft
                    jawPlateBoltPattern: '0.938" from base, 3.875" center to center',
                    brakeSetScrew: '1/2"-13 x 1.25" Brass Tipped',
                    brakeTorque: 10, // lbs-ft
                    brakeTravel: '0.00" - 0.25"'
                }
            },
            
            accessories: {
                subplatesSteel: [
                    { sku: '100-401', description: 'Compact Subplate for 6" Vises', size: '6 x 20.0 x 1.38', price: 399 },
                    { sku: '100-402', description: 'Compact Subplate for 6" Vises', size: '6 x 17.5 x 1.38', price: 379 },
                    { sku: '100-403', description: 'Compact Subplate for 6" Vises', size: '6 x 16.0 x 1.38', price: 359 },
                    { sku: '100-411', description: 'Compact Subplate for 4.5" Vises', size: '4.5 x 20.0 x 1.38', price: 379 },
                    { sku: '100-412', description: 'Compact Subplate for 4.5" Vises', size: '4.5 x 17.5 x 1.38', price: 359 },
                    { sku: '100-413', description: 'Compact Subplate for 4.5" Vises', size: '4.5 x 16.0 x 1.38', price: 339 }
                ],
                masterJaws6Inch: [
                    { sku: '700-101', description: '6" IJS Master Sliding Jaw', size: '6 x 4.00 x 1.69', price: 199 },
                    { sku: '700-102', description: '6" IJS Master Center Jaw', size: '6 x 3.12 x 1.69', price: 199 },
                    { sku: '700-103', description: '6" IJS Laydown Center Jaw', size: '6 x 2.00 x 1.69', price: 149 },
                    { sku: '700-104', description: '6" Hardened Jawplates (2)', size: '6 x 1.71 x 0.75', price: 99 }
                ],
                machinableSoftJaws6Inch: [
                    { sku: '701-001', description: 'Machinable Sliding Jaw - Steel', size: '6 x 4.63 x 2.0', price: 129 },
                    { sku: '701-002', description: 'Machinable Sliding Jaw - 6061 Alum', size: '6 x 4.63 x 2.0', price: 79 },
                    { sku: '701-003', description: 'Machinable Sliding Jaw - 7075 Alum', size: '6 x 4.63 x 2.0', price: 109 },
                    { sku: '701-011', description: 'Machinable Center Jaw - Steel', size: '6 x 4.00 x 2.0', price: 109 },
                    { sku: '701-012', description: 'Machinable Center Jaw - 6061 Alum', size: '6 x 4.00 x 2.0', price: 69 },
                    { sku: '701-013', description: 'Machinable Center Jaw - 7075 Alum', size: '6 x 4.00 x 2.0', price: 99 }
                ],
                ballCouplers: [
                    { sku: '100-901', description: 'Ball Coupler', size: '1.5" OD', price: 99 },
                    { sku: '100-911', description: 'Ball Receiver A (Round)', size: '1.5" ID x 3.0" OD', price: 99 },
                    { sku: '100-912', description: 'Ball Receiver B (Oblong)', size: '1.5" ID x 3.0" OD', price: 99 }
                ],
                tombstones: [
                    { sku: '100-301', model: 'OV45-200-8SSQ', description: '4.5" 8-Station Square Column', size: '6" x 6" cross section', price: 9999 },
                    { sku: '100-311', model: 'OV6-200-8SSQ', description: '6" 8-Station Square Column', size: '9" x 9" cross section', price: 9999 },
                    { sku: '100-302', description: '6.0" Square Column with Ball Receivers', size: 'Column: 6 x 6 x 22', price: 1999 },
                    { sku: '100-312', description: '8.0" Square Column with Ball Receivers', size: 'Column: 8 x 8 x 22', price: 2499 }
                ]
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 3: CUTTING TOOLS & PARAMETERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    cuttingTools: {
        
        // ─────────────────────────────────────────────────────────────────────
        // SGS/KYOCERA CUTTING TOOLS
        // Source: SGS_Global_Catalog_v26.1.pdf (436 pages)
        // ─────────────────────────────────────────────────────────────────────
        sgs: {
            brand: 'SGS / KYOCERA SGS Precision Tools',
            country: 'USA',
            website: 'www.kyocera-sgstool.com',
            
            coatings: {
                'Ti-NAMITE': {
                    description: 'Titanium Nitride (TiN)',
                    color: 'Gold',
                    layerStructure: 'Multilayer',
                    thickness: '1-5 microns',
                    hardness: 2200, // HV
                    thermalStability: 600, // °C
                    frictionCoef: '0.40-0.65',
                    applications: 'General purpose, wide variety of materials'
                },
                'Ti-NAMITE-A': {
                    description: 'Aluminum Titanium Nitride (AlTiN)',
                    color: 'Dark grey',
                    layerStructure: 'Nano structure',
                    thickness: '1-5 microns',
                    hardness: 3700,
                    thermalStability: 1100,
                    frictionCoef: '0.30',
                    applications: 'Dry cutting, high thermal/chemical resistance, carbide protection'
                },
                'Ti-NAMITE-B': {
                    description: 'Titanium DiBoride (TiB2)',
                    color: 'Light grey-silver',
                    layerStructure: 'Monolayer',
                    thickness: '1-2 microns',
                    hardness: 4000,
                    thermalStability: 850,
                    frictionCoef: '0.10-0.20',
                    applications: 'Aluminum, copper, non-ferrous, prevents cold welding'
                },
                'Ti-NAMITE-C': {
                    description: 'Titanium Carbonitride (TiCN)',
                    color: 'Pink-red',
                    layerStructure: 'Multilayer',
                    thickness: '1-5 microns',
                    hardness: 3000,
                    thermalStability: 400,
                    frictionCoef: '0.30-0.45',
                    applications: 'Interrupted cuts, milling, good toughness'
                }
            },
            
            endMillSeries: {
                'Z-Carb-XPR': {
                    series: ['ZR', 'ZRCR'],
                    fluteCount: 4,
                    cutDiaRange: { inch: '0.250-0.750', metric: '6-20mm' },
                    cutLengthMultiplier: '2-3x DC',
                    helix: 'Variable',
                    coating: ['Ti-NAMITE-X', 'MEGACOAT NANO'],
                    centerCutting: true,
                    fluteIndex: 'Unequal',
                    maxRampAngle: 90,
                    chipbreaker: 'By request',
                    shankOptions: ['Solid Round', 'Weldon Flat']
                },
                'Z-Carb-AP': {
                    series: ['Z1P', 'Z1PCR', 'Z1PLC', 'Z1PB', 'Z1PLB'],
                    fluteCount: 4,
                    cutDiaRange: { inch: '0.0156-1.0', metric: '1-25mm' },
                    cutLengthMultiplier: '1-3.25x DC',
                    reachMultiplier: '2.5-8.5x DC',
                    helix: '35/38° variable',
                    coating: 'Ti-NAMITE-X',
                    centerCutting: true,
                    fluteIndex: 'Unequal',
                    maxRampAngle: 90,
                    endStyles: ['Square', 'Corner Radius', 'Ball']
                }
            },
            
            cuttingParameters: {
                zCarbXPR: {
                    // Fractional inch data
                    fractional: {
                        carbonSteels: {
                            hardnessMax: '28 HRc',
                            bhnMax: 275,
                            materials: ['1018', '1040', '1080', '1090', '10L50', '1140', '1212', '12L15', '1525', '1536'],
                            profile: { sfm: 675, sfmRange: '540-810' },
                            slot: { sfm: 450, sfmRange: '360-540' },
                            plunge: { sfm: 640, sfmRange: '512-768' },
                            feedPerTooth: {
                                '0.250': { profile: 0.0017, slot: 0.0014, plunge: 0.0013 },
                                '0.375': { profile: 0.0029, slot: 0.0025, plunge: 0.0022 },
                                '0.500': { profile: 0.0041, slot: 0.0035, plunge: 0.0032 },
                                '0.625': { profile: 0.0045, slot: 0.0039, plunge: 0.0035 },
                                '0.750': { profile: 0.0048, slot: 0.0042, plunge: 0.0038 }
                            }
                        },
                        alloySteels: {
                            hardnessMax: '40 HRc',
                            bhnMax: 375,
                            materials: ['4140', '4150', '4320', '5120', '5150', '8630', '86L20', '50100'],
                            profile: { sfm: 525, sfmRange: '420-630' },
                            slot: { sfm: 350, sfmRange: '280-420' },
                            plunge: { sfm: 500, sfmRange: '400-600' },
                            feedPerTooth: {
                                '0.250': { profile: 0.0011, slot: 0.0010, plunge: 0.0009 },
                                '0.375': { profile: 0.0024, slot: 0.0021, plunge: 0.0019 },
                                '0.500': { profile: 0.0036, slot: 0.0031, plunge: 0.0028 },
                                '0.625': { profile: 0.0039, slot: 0.0034, plunge: 0.0031 },
                                '0.750': { profile: 0.0042, slot: 0.0037, plunge: 0.0033 }
                            }
                        },
                        toolSteels: {
                            hardnessMax: '40 HRc',
                            bhnMax: 375,
                            materials: ['A2', 'D2', 'H13', 'L2', 'M2', 'P20', 'S7', 'T15', 'W2'],
                            profile: { sfm: 240, sfmRange: '192-288' },
                            slot: { sfm: 160, sfmRange: '128-192' },
                            plunge: { sfm: 220, sfmRange: '176-264' },
                            feedPerTooth: {
                                '0.250': { profile: 0.0009, slot: 0.0008, plunge: 0.0007 },
                                '0.375': { profile: 0.0018, slot: 0.0016, plunge: 0.0014 },
                                '0.500': { profile: 0.0026, slot: 0.0023, plunge: 0.0021 },
                                '0.625': { profile: 0.0030, slot: 0.0026, plunge: 0.0023 },
                                '0.750': { profile: 0.0033, slot: 0.0028, plunge: 0.0025 }
                            }
                        },
                        castIronLowMed: {
                            hardnessMax: '19 HRc',
                            bhnMax: 220,
                            materials: ['Gray', 'Malleable', 'Ductile'],
                            profile: { sfm: 630, sfmRange: '504-756' },
                            slot: { sfm: 420, sfmRange: '336-504' },
                            plunge: { sfm: 600, sfmRange: '480-720' }
                        },
                        castIronHigh: {
                            hardnessMax: '26 HRc',
                            bhnMax: 260,
                            materials: ['Gray', 'Malleable', 'Ductile'],
                            profile: { sfm: 375, sfmRange: '300-450' },
                            slot: { sfm: 250, sfmRange: '200-300' },
                            plunge: { sfm: 350, sfmRange: '280-420' }
                        },
                        superAlloys: {
                            hardnessMax: '32 HRc',
                            bhnMax: 300,
                            materials: ['Inconel 601', 'Inconel 617', 'Inconel 625', 'Incoloy', 'Monel 400'],
                            profile: { sfm: 105, sfmRange: '84-126' },
                            slot: { sfm: 70, sfmRange: '56-84' },
                            ramp3deg: { sfm: 100, sfmRange: '80-120' }
                        }
                    }
                }
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // HAIMER CUTTING TOOLS
        // Source: Haimer USA Master Catalog.pdf
        // ─────────────────────────────────────────────────────────────────────
        haimer: {
            brand: 'HAIMER',
            country: 'Germany',
            
            materialGroups: {
                P1: { 
                    name: 'General construction steels', 
                    ansi: ['A252', 'A50-2', '1045'],
                    din: ['1.0038', '1.0050', '1.0503'],
                    tensileMax: '800 N/mm² (116,000 PSI)',
                    hardnessMax: '25 HRc'
                },
                P2: { 
                    name: 'Heat treated steels', 
                    ansi: ['D2', '4140'],
                    din: ['1.2367', '1.2379', '1.2363', '1.7225'],
                    tensileMin: '800 N/mm² (116,000 PSI)',
                    hardnessMax: '45 HRc'
                },
                M1: { 
                    name: 'Stainless steels (soft)', 
                    ansi: ['303', '304'],
                    din: ['1.4305', '1.4301', '1.4034'],
                    tensileMax: '650 N/mm² (94,275 PSI)'
                },
                M2: { 
                    name: 'Stainless steels (hard)', 
                    ansi: ['316Ti', '316L'],
                    din: ['1.4571', '1.4404', '1.4418'],
                    tensileMin: '650 N/mm² (94,275 PSI)'
                },
                K1: { 
                    name: 'Cast iron (soft)', 
                    ansi: ['ASTM A48 NO. 30', 'ASTM A48 NO. 55/60', 'G1800'],
                    din: ['0.6020', '0.6040', '0.7040'],
                    tensileMax: '450 N/mm² (65,265 PSI)'
                },
                K2: { 
                    name: 'Cast iron (hard)', 
                    ansi: ['ASTM A536 80-55-06', 'ASTM A536 100-70-06'],
                    din: ['0.7060', '0.7070'],
                    tensileMin: '450 N/mm² (65,265 PSI)'
                },
                S1: { 
                    name: 'Titanium alloys', 
                    ansi: ['Ti6Al4V'],
                    din: ['3.7165']
                },
                S2: { 
                    name: 'High temp alloys', 
                    materials: ['Inconel', 'Nimonic'],
                    tensile: '800-1700 N/mm²'
                },
                N1: { 
                    name: 'Wrought aluminum', 
                    ansi: ['A5005', 'A6061', 'A7075'],
                    din: ['3.3315'],
                    silicon: '<9%'
                },
                N2: { 
                    name: 'Cast aluminum', 
                    ansi: ['A310', 'A400'],
                    din: ['3.2581'],
                    silicon: '>9%'
                },
                H1: { 
                    name: 'Hardened steels', 
                    hardness: '45-55 HRc'
                }
            },
            
            cuttingData: {
                haimerMillPower: {
                    // F1003NN series - Sharp cutting edge
                    description: 'Power Series End Mills',
                    cutWidths: {
                        ae100_ap1xD: 'Full slot',
                        ae50_ap15xD: 'Medium engagement',
                        ae25_apMax: 'Light engagement'
                    },
                    speedsSFM: {
                        P1: { ae100: '557-656', ae50: '689-787', ae25: '820-885' },
                        P2: { ae100: '295-361', ae50: '361-426', ae25: '426-492' },
                        M1: { ae100: '-', ae50: '-', ae25: '180-213' },
                        M2: { ae100: '-', ae50: '-', ae25: '131-164' },
                        K1: { ae100: '361-426', ae50: '426-492', ae25: '656-721' },
                        K2: { ae100: '295-361', ae50: '361-426', ae25: '525-590' },
                        S1: { ae100: '197-262', ae50: '197-262', ae25: '197-262' },
                        S2: { ae100: '98-131', ae50: '98-131', ae25: '98-131' },
                        N1: { ae100: '393-787', ae50: '393-787', ae25: '393-787' },
                        N2: { ae100: '393-787', ae50: '393-787', ae25: '393-787' },
                        H1: { ae100: '131-197', ae50: '197-262', ae25: '197-262' }
                    },
                    feedPerToothInch: {
                        // Dia: fz at ae<50%, fz at ae=100%
                        '3/32': { ae50: 0.0006, ae100: 0.0005, finishStep: 0.0001 },
                        '1/8': { ae50: 0.0008, ae100: 0.0006, finishStep: 0.0001 },
                        '3/16': { ae50: 0.0011, ae100: 0.0009, finishStep: 0.0002 },
                        '1/4': { ae50: 0.0015, ae100: 0.0013, finishStep: 0.0003 },
                        '5/16': { ae50: 0.0019, ae100: 0.0016, finishStep: 0.0003 },
                        '3/8': { ae50: 0.0023, ae100: 0.0019, finishStep: 0.0004 },
                        '1/2': { ae50: 0.0030, ae100: 0.0025, finishStep: 0.0005 },
                        '5/8': { ae50: 0.0038, ae100: 0.0031, finishStep: 0.0006 },
                        '3/4': { ae50: 0.0045, ae100: 0.0038, finishStep: 0.0008 },
                        '1': { ae50: 0.0060, ae100: 0.0050, finishStep: 0.0010 }
                    }
                },
                haimerMillBallNose: {
                    // V1002NN series
                    description: 'Ball Nose End Mills',
                    speedsMetric: {
                        P1: { roughing: '180-220', finishing: '280-320' },
                        P2: { roughing: '170-190', finishing: '270-290' },
                        M1: { roughing: '110-130', finishing: '170-190' },
                        M2: { roughing: '70-90', finishing: '120-140' },
                        K1: { roughing: '190-210', finishing: '290-310' },
                        K2: { roughing: '140-160', finishing: '220-240' },
                        S1: { roughing: '60-80', finishing: '60-80' },
                        S2: { roughing: '30-40', finishing: '30-40' },
                        N1: { roughing: '120-240', finishing: '120-240' },
                        N2: { roughing: '120-240', finishing: '120-240' },
                        H1: { roughing: '40-60', finishing: '60-80' }
                    },
                    feedPerToothMm: {
                        '2': { ae50: 0.02, ae100: 0.01, finishStep: 0.002 },
                        '3': { ae50: 0.03, ae100: 0.015, finishStep: 0.003 },
                        '4': { ae50: 0.04, ae100: 0.02, finishStep: 0.004 },
                        '5': { ae50: 0.05, ae100: 0.025, finishStep: 0.005 },
                        '6': { ae50: 0.06, ae100: 0.03, finishStep: 0.006 },
                        '8': { ae50: 0.08, ae100: 0.04, finishStep: 0.008 },
                        '10': { ae50: 0.10, ae100: 0.05, finishStep: 0.010 },
                        '12': { ae50: 0.12, ae100: 0.06, finishStep: 0.012 },
                        '16': { ae50: 0.16, ae100: 0.08, finishStep: 0.016 },
                        '20': { ae50: 0.20, ae100: 0.10, finishStep: 0.020 }
                    }
                },
                haimerMillHF: {
                    // H2006UK series - High Feed
                    description: 'High Feed Milling',
                    speedsMetric: {
                        P1: { roughing: '250-320', finishing: '340-420' },
                        P2: { roughing: '190-220', finishing: '240-310' },
                        M1: { roughing: '95-115', finishing: '135-170' },
                        M2: { roughing: '75-95', finishing: '105-130' },
                        K1: { roughing: '160-180', finishing: '200-230' },
                        K2: { roughing: '130-150', finishing: '170-200' },
                        S1: { roughing: '50-60', finishing: '80-90' },
                        S2: { roughing: '30-40', finishing: '30-40' },
                        N1: { roughing: '500-900', finishing: '500-900' },
                        N2: { roughing: '120-350', finishing: '120-350' },
                        H1: { roughing: '40-60', finishing: '60-80' }
                    },
                    feedPerToothMm: {
                        '10': { fzRange: '0.1-0.3', apHFC: 0.75 },
                        '12': { fzRange: '0.12-0.36', apHFC: 0.9 },
                        '16': { fzRange: '0.16-0.48', apHFC: 1.2 },
                        '20': { fzRange: '0.2-0.6', apHFC: 1.5 }
                    }
                },
                duoLockMill: {
                    // F2003MN series - DUO-LOCK
                    description: 'DUO-LOCK Sharp Cutting Edge',
                    speedsSFM: {
                        P1: { roughing: '525-725', finishing: '725-920' },
                        P2: { roughing: '395-525', finishing: '525-655' },
                        M1: { roughing: '260-395', finishing: '395-525' },
                        M2: { roughing: '195-295', finishing: '295-395' },
                        K1: { roughing: '395-590', finishing: '590-785' },
                        K2: { roughing: '260-525', finishing: '525-720' },
                        S1: { roughing: '130-260', finishing: '130-260' },
                        S2: { roughing: '100-130', finishing: '100-130' },
                        N1: { roughing: '1640-2950', finishing: '1640-2950' },
                        N2: { roughing: '395-1150', finishing: '395-1150' },
                        H1: { roughing: '130-195', finishing: '195-260' }
                    },
                    feedPerToothInch: {
                        '3/8': '0.0011-0.0035',
                        '1/2': '0.0011-0.0039',
                        '5/8': '0.0016-0.0047',
                        '3/4': '0.002-0.005'
                    }
                }
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 4: CATALOG MANIFEST
    // ═══════════════════════════════════════════════════════════════════════════
    
    catalogManifest: [
        // Tool Holders
        { filename: 'guhring tool holders.pdf', pages: 6, size: '664K', category: 'tool_holders', brand: 'Guhring', extracted: true },
        { filename: 'BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf', pages: 628, size: '25M', category: 'tool_holders', brand: 'BIG DAISHOWA', extracted: true },
        { filename: 'Haimer USA Master Catalog.pdf', pages: 862, size: '353M', category: 'tool_holders_cutting', brand: 'Haimer', extracted: true },
        { filename: 'REGO-FIX Catalogue 2026 ENGLISH.pdf', pages: 448, size: '208M', category: 'tool_holders', brand: 'REGO-FIX', extracted: false },
        { filename: 'CAMFIX_Catalog.pdf', pages: null, size: '53M', category: 'tool_holders', brand: 'CAMFIX', extracted: false },
        
        // Workholding
        { filename: '543f80b8_2016_orange_vise_catalog.pdf', pages: 10, size: '3M', category: 'workholding', brand: 'Orange Vise', extracted: true },
        
        // Cutting Tools
        { filename: 'SGS_Global_Catalog_v26.1.pdf', pages: 436, size: '16M', category: 'cutting_tools', brand: 'SGS/Kyocera', extracted: true },
        { filename: 'OSG.pdf', pages: null, size: '110M', category: 'cutting_tools', brand: 'OSG', extracted: false },
        { filename: 'ISCAR PART 1.pdf', pages: null, size: '354M', category: 'cutting_tools', brand: 'ISCAR', extracted: false },
        { filename: 'INGERSOLL CUTTING TOOLS.pdf', pages: null, size: '104M', category: 'cutting_tools', brand: 'Ingersoll', extracted: false },
        { filename: 'guhring full catalog.pdf', pages: null, size: '49M', category: 'cutting_tools', brand: 'Guhring', extracted: false },
        { filename: 'korloy rotating.pdf', pages: null, size: '56M', category: 'cutting_tools', brand: 'Korloy', extracted: false },
        { filename: 'korloy solid.pdf', pages: null, size: '94M', category: 'cutting_tools', brand: 'Korloy', extracted: false },
        { filename: 'korloy turning.pdf', pages: null, size: '43M', category: 'cutting_tools', brand: 'Korloy', extracted: false },
        { filename: 'MA_Ford_US_Product_Catalog_vol105interactiveweb.pdf', pages: null, size: '162M', category: 'cutting_tools', brand: 'MA Ford', extracted: false },
        { filename: 'Accupro 2013.pdf', pages: null, size: '42M', category: 'cutting_tools', brand: 'Accupro', extracted: false },
        { filename: 'ZK12023_DEGB RevA EMUGE Katalog 160.pdf', pages: null, size: '233M', category: 'cutting_tools', brand: 'EMUGE', extracted: false },
        { filename: 'Flash_Solid_catalog_INCH.pdf', pages: null, size: '86M', category: 'cutting_tools', brand: 'Flash', extracted: false },
        
        // General Catalogs
        { filename: 'Cutting Tools Master 2022 English Inch.pdf', pages: null, size: '149M', category: 'cutting_tools', brand: 'Mitsubishi', extracted: false },
        { filename: 'Cutting Tools Master 2022 English Metric.pdf', pages: null, size: '265M', category: 'cutting_tools', brand: 'Mitsubishi', extracted: false },
        { filename: 'Master Catalog 2018 Vol. 1 Turning Tools English Inch.pdf', pages: null, size: '118M', category: 'turning', brand: 'Sandvik', extracted: false },
        { filename: 'Master Catalog 2018 Vol. 2 Rotating Tools English Inch.pdf', pages: null, size: '259M', category: 'rotating', brand: 'Sandvik', extracted: false },
        { filename: 'GC_2023-2024_US_Milling.pdf', pages: null, size: '48M', category: 'milling', brand: 'GC', extracted: false },
        { filename: 'GC_2023-2024_US_Drilling.pdf', pages: null, size: '16M', category: 'drilling', brand: 'GC', extracted: false },
        { filename: 'GC_2023-2024_US_Turning-Grooving.pdf', pages: null, size: '48M', category: 'turning', brand: 'GC', extracted: false },
        { filename: 'GC_2023-2024_US_Tooling.pdf', pages: null, size: '9.7M', category: 'tooling', brand: 'GC', extracted: false },
        { filename: 'Milling 2018.1.pdf', pages: null, size: '39M', category: 'milling', brand: 'Sandvik', extracted: false },
        { filename: 'Turning 2018.1.pdf', pages: null, size: '53M', category: 'turning', brand: 'Sandvik', extracted: false },
        { filename: 'Threading 2018.1.pdf', pages: null, size: '20M', category: 'threading', brand: 'Sandvik', extracted: false },
        { filename: 'Holemaking.pdf', pages: null, size: '56M', category: 'drilling', brand: 'Sandvik', extracted: false },
        { filename: 'Solid End Mills.pdf', pages: null, size: '40M', category: 'cutting_tools', brand: 'Sandvik', extracted: false },
        { filename: 'Tooling Systems.pdf', pages: null, size: '29M', category: 'tooling', brand: 'Sandvik', extracted: false },
        { filename: 'TURNING_CATALOG_PART 1.pdf', pages: null, size: '204M', category: 'turning', brand: 'Unknown', extracted: false },
        { filename: 'zeni catalog.pdf', pages: null, size: '183M', category: 'cutting_tools', brand: 'Zeni', extracted: false },
        { filename: 'AMPC_US-EN.pdf', pages: null, size: '167M', category: 'cutting_tools', brand: 'AMPC', extracted: false },
        { filename: 'catalog_c010b_full.pdf', pages: null, size: '99M', category: 'cutting_tools', brand: 'Unknown', extracted: false },
        { filename: '01-Global-CNC-Full-Catalog-2023.pdf', pages: null, size: '54M', category: 'cnc_accessories', brand: 'Global CNC', extracted: false },
        { filename: '2018 Rapidkut Catalog.pdf', pages: null, size: '4M', category: 'cutting_tools', brand: 'Rapidkut', extracted: false },
        { filename: 'Metalmorphosis-2021-FINAL-reduced-for-Web.pdf', pages: null, size: '24M', category: 'cutting_tools', brand: 'Metalmorphosis', extracted: false },
        { filename: 'Tooling Systems News 2018 English MetricInch.pdf', pages: null, size: '12M', category: 'tooling', brand: 'Sandvik', extracted: false }
    ],
    
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════════════════
    
    getToolHolderByTaper: function(taper) {
        const results = [];
        // Search Guhring
        if (this.toolHolders.guhring?.catHydraulicHolders?.models) {
            results.push(...this.toolHolders.guhring.catHydraulicHolders.models.filter(m => m.taper === taper));
        }
        if (this.toolHolders.guhring?.catShrinkFitHolders?.models) {
            results.push(...this.toolHolders.guhring.catShrinkFitHolders.models.filter(m => m.taper === taper));
        }
        return results;
    },
    
    getCuttingParamsForMaterial: function(materialType, toolSeries = 'zCarbXPR') {
        const params = this.cuttingTools.sgs?.cuttingParameters?.[toolSeries]?.fractional;
        if (!params) return null;
        
        const materialMap = {
            'carbon_steel': 'carbonSteels',
            'alloy_steel': 'alloySteels',
            'tool_steel': 'toolSteels',
            'cast_iron_soft': 'castIronLowMed',
            'cast_iron_hard': 'castIronHigh',
            'superalloy': 'superAlloys'
        };
        
        return params[materialMap[materialType] || materialType];
    },
    
    getViseByWidth: function(width) {
        const vises = [];
        if (width === 6) {
            vises.push(...(this.workholding.orangeVise?.vises?.sixInchDualStation || []));
        } else if (width === 4.5) {
            vises.push(...(this.workholding.orangeVise?.vises?.fourFiveInchDualStation || []));
        }
        return vises;
    },
    
    getStats: function() {
        return {
            totalCatalogs: this.catalogManifest.length,
            extractedCatalogs: this.catalogManifest.filter(c => c.extracted).length,
            toolHolderBrands: Object.keys(this.toolHolders).length,
            workholdingBrands: Object.keys(this.workholding).length,
            cuttingToolBrands: Object.keys(this.cuttingTools).length,
            guhringHydraulicSpecs: this.toolHolders.guhring?.hydraulicChucks?.specifications?.length || 0,
            guhringCatHolders: this.toolHolders.guhring?.catHydraulicHolders?.models?.length || 0,
            orangeViseModels: (this.workholding.orangeVise?.vises?.sixInchDualStation?.length || 0) + 
                             (this.workholding.orangeVise?.vises?.fourFiveInchDualStation?.length || 0),
            sgsCoatings: Object.keys(this.cuttingTools.sgs?.coatings || {}).length,
            haimerMaterialGroups: Object.keys(this.cuttingTools.haimer?.materialGroups || {}).length
        };
    }
};

// Register with PRISM Gateway if available
if (typeof PRISM_GATEWAY !== 'undefined') {
    PRISM_GATEWAY.register('catalog.toolHolders.getByTaper', 'PRISM_MANUFACTURER_CATALOG_DATABASE.getToolHolderByTaper');
    PRISM_GATEWAY.register('catalog.cuttingParams.getByMaterial', 'PRISM_MANUFACTURER_CATALOG_DATABASE.getCuttingParamsForMaterial');
    PRISM_GATEWAY.register('catalog.workholding.getViseByWidth', 'PRISM_MANUFACTURER_CATALOG_DATABASE.getViseByWidth');
    PRISM_GATEWAY.register('catalog.stats', 'PRISM_MANUFACTURER_CATALOG_DATABASE.getStats');
}

    // ═══════════════════════════════════════════════════════════════
    // BATCH 2: CUTTING PARAMETERS (v2)
    // ═══════════════════════════════════════════════════════════════
    // SECTION 1: OSG CUTTING TOOLS
    // Source: OSG.pdf (1708 pages)
    // ═══════════════════════════════════════════════════════════════════════════
    
    osg: {
        brand: 'OSG',
        country: 'Japan',
        website: 'www.osgtool.com',
        catalogPages: 1708,
        
        // ─────────────────────────────────────────────────────────────────────
        // A Brand ADO Carbide Drills - Speed/Feed Tables
        // ─────────────────────────────────────────────────────────────────────
        adoCarbideDrills: {
            series: ['ADO-3D', 'ADO-5D', 'ADO-8D', 'ADO-10D', 'ADO-15D', 'ADO-20D', 'ADO-30D', 'ADO-40D', 'ADO-50D'],
            coating: 'EgiAs',
            features: ['Coolant-through', '2 flute', '30° helix', 'h6 shank'],
            pointAngle: 140,
            
            // Material: Carbon Steels, Mild Steels (1010, 1050, 12L14)
            carbonSteel: {
                sfmRange: [260, 395],
                cuttingData: [
                    // { drillDia (mm), drillDiaInch, rpm, iprMin, iprMax }
                    { dia: 2, diaInch: 0.079, rpm: 15870, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 3, diaInch: 0.118, rpm: 10580, iprMin: 0.002, iprMax: 0.005 },
                    { dia: 3.175, diaInch: 0.125, rpm: 10000, iprMin: 0.003, iprMax: 0.005 },
                    { dia: 4, diaInch: 0.157, rpm: 7940, iprMin: 0.003, iprMax: 0.006 },
                    { dia: 4.7625, diaInch: 0.1875, rpm: 6670, iprMin: 0.004, iprMax: 0.007 },
                    { dia: 6, diaInch: 0.236, rpm: 5290, iprMin: 0.005, iprMax: 0.009 },
                    { dia: 6.35, diaInch: 0.250, rpm: 5000, iprMin: 0.006, iprMax: 0.009 },
                    { dia: 8, diaInch: 0.315, rpm: 3970, iprMin: 0.006, iprMax: 0.011 },
                    { dia: 9.525, diaInch: 0.375, rpm: 3330, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 10, diaInch: 0.394, rpm: 3170, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 11.1125, diaInch: 0.4375, rpm: 2860, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12, diaInch: 0.472, rpm: 2650, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12.7, diaInch: 0.500, rpm: 2500, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 14, diaInch: 0.551, rpm: 2270, iprMin: 0.009, iprMax: 0.014 },
                    { dia: 15.875, diaInch: 0.625, rpm: 2000, iprMin: 0.010, iprMax: 0.014 },
                    { dia: 16, diaInch: 0.630, rpm: 2000, iprMin: 0.010, iprMax: 0.014 },
                    { dia: 18, diaInch: 0.709, rpm: 1760, iprMin: 0.011, iprMax: 0.015 },
                    { dia: 19.05, diaInch: 0.750, rpm: 1670, iprMin: 0.012, iprMax: 0.015 },
                    { dia: 20, diaInch: 0.787, rpm: 1590, iprMin: 0.012, iprMax: 0.016 }
                ]
            },
            
            // Material: Alloy Steels (4140, 4130)
            alloySteel: {
                sfmRange: [260, 395],
                cuttingData: [
                    { dia: 2, rpm: 15870, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 3, rpm: 10580, iprMin: 0.002, iprMax: 0.005 },
                    { dia: 3.175, rpm: 10000, iprMin: 0.003, iprMax: 0.005 },
                    { dia: 4, rpm: 7940, iprMin: 0.003, iprMax: 0.006 },
                    { dia: 6, rpm: 5290, iprMin: 0.005, iprMax: 0.009 },
                    { dia: 6.35, rpm: 5000, iprMin: 0.005, iprMax: 0.010 },
                    { dia: 8, rpm: 3970, iprMin: 0.006, iprMax: 0.011 },
                    { dia: 9.525, rpm: 3330, iprMin: 0.007, iprMax: 0.012 },
                    { dia: 10, rpm: 3170, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12, rpm: 2650, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12.7, rpm: 2500, iprMin: 0.008, iprMax: 0.012 }
                ]
            },
            
            // Material: Stainless Steels (300SS, 400SS, 17-4PH)
            stainlessSteel: {
                sfmRange: [130, 230],
                cuttingData: [
                    { dia: 2, rpm: 8740, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 3, rpm: 5820, iprMin: 0.002, iprMax: 0.005 },
                    { dia: 3.175, rpm: 5500, iprMin: 0.003, iprMax: 0.005 },
                    { dia: 4, rpm: 4370, iprMin: 0.003, iprMax: 0.006 },
                    { dia: 6, rpm: 2910, iprMin: 0.005, iprMax: 0.009 },
                    { dia: 6.35, rpm: 2750, iprMin: 0.006, iprMax: 0.009 },
                    { dia: 8, rpm: 2180, iprMin: 0.006, iprMax: 0.011 },
                    { dia: 9.525, rpm: 1830, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 10, rpm: 1750, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12, rpm: 1460, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12.7, rpm: 1380, iprMin: 0.008, iprMax: 0.012 }
                ]
            },
            
            // Material: Titanium Alloy (Ti-6Al-4V)
            titanium: {
                sfmRange: [100, 180],
                cuttingData: [
                    { dia: 2, rpm: 6790, iprMin: 0.002, iprMax: 0.003 },
                    { dia: 3, rpm: 4530, iprMin: 0.002, iprMax: 0.003 },
                    { dia: 3.175, rpm: 4280, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 4, rpm: 3400, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 6, rpm: 2269, iprMin: 0.004, iprMax: 0.005 },
                    { dia: 6.35, rpm: 2140, iprMin: 0.004, iprMax: 0.006 },
                    { dia: 8, rpm: 1700, iprMin: 0.005, iprMax: 0.007 },
                    { dia: 9.525, rpm: 1430, iprMin: 0.005, iprMax: 0.008 },
                    { dia: 10, rpm: 1360, iprMin: 0.006, iprMax: 0.009 },
                    { dia: 12, rpm: 1130, iprMin: 0.007, iprMax: 0.011 },
                    { dia: 12.7, rpm: 1070, iprMin: 0.008, iprMax: 0.012 }
                ]
            },
            
            // Material: Inconel / Nickel Alloys
            inconel: {
                sfmRange: [65, 110],
                cuttingData: [
                    { dia: 2, rpm: 4250, iprMin: 0.001, iprMax: 0.002 },
                    { dia: 3, rpm: 2840, iprMin: 0.001, iprMax: 0.002 },
                    { dia: 3.175, rpm: 2680, iprMin: 0.002, iprMax: 0.002 },
                    { dia: 4, rpm: 2130, iprMin: 0.002, iprMax: 0.002 },
                    { dia: 6, rpm: 1420, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 6.35, rpm: 1340, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 8, rpm: 1060, iprMin: 0.003, iprMax: 0.005 },
                    { dia: 9.525, rpm: 890, iprMin: 0.004, iprMax: 0.005 },
                    { dia: 10, rpm: 850, iprMin: 0.004, iprMax: 0.006 },
                    { dia: 12, rpm: 710, iprMin: 0.005, iprMax: 0.007 },
                    { dia: 12.7, rpm: 670, iprMin: 0.005, iprMax: 0.008 }
                ]
            },
            
            // Material: Cast Iron
            castIron: {
                sfmRange: [260, 395],
                cuttingData: [
                    { dia: 2, rpm: 15870, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 3, rpm: 10580, iprMin: 0.002, iprMax: 0.005 },
                    { dia: 4, rpm: 7940, iprMin: 0.003, iprMax: 0.006 },
                    { dia: 6, rpm: 5290, iprMin: 0.005, iprMax: 0.009 },
                    { dia: 8, rpm: 3970, iprMin: 0.006, iprMax: 0.011 },
                    { dia: 10, rpm: 3170, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12, rpm: 2650, iprMin: 0.008, iprMax: 0.012 }
                ]
            },
            
            // Material: Hardened Steel 26-30 HRC
            hardenedSteel_26_30: {
                sfmRange: [195, 295],
                cuttingData: [
                    { dia: 2, rpm: 11890, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 3, rpm: 7920, iprMin: 0.002, iprMax: 0.005 },
                    { dia: 4, rpm: 5940, iprMin: 0.003, iprMax: 0.006 },
                    { dia: 6, rpm: 3960, iprMin: 0.005, iprMax: 0.009 },
                    { dia: 8, rpm: 2970, iprMin: 0.006, iprMax: 0.011 },
                    { dia: 10, rpm: 2380, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12, rpm: 1980, iprMin: 0.008, iprMax: 0.012 }
                ]
            },
            
            // Material: Hardened Steel 30-34 HRC
            hardenedSteel_30_34: {
                sfmRange: [130, 200],
                cuttingData: [
                    { dia: 2, rpm: 8000, iprMin: 0.002, iprMax: 0.003 },
                    { dia: 3, rpm: 5330, iprMin: 0.002, iprMax: 0.003 },
                    { dia: 4, rpm: 4000, iprMin: 0.003, iprMax: 0.004 },
                    { dia: 6, rpm: 2700, iprMin: 0.005, iprMax: 0.006 },
                    { dia: 8, rpm: 2000, iprMin: 0.006, iprMax: 0.008 },
                    { dia: 10, rpm: 1600, iprMin: 0.008, iprMax: 0.010 },
                    { dia: 12, rpm: 1330, iprMin: 0.009, iprMax: 0.012 }
                ]
            },
            
            // Material: Hardened Steel 34-43 HRC
            hardenedSteel_34_43: {
                sfmRange: [130, 160],
                cuttingData: [
                    { dia: 2, rpm: 7040, iprMin: 0.002, iprMax: 0.003 },
                    { dia: 3, rpm: 4690, iprMin: 0.002, iprMax: 0.003 },
                    { dia: 4, rpm: 3520, iprMin: 0.003, iprMax: 0.004 },
                    { dia: 6, rpm: 2340, iprMin: 0.005, iprMax: 0.006 },
                    { dia: 8, rpm: 1760, iprMin: 0.006, iprMax: 0.008 },
                    { dia: 10, rpm: 1410, iprMin: 0.008, iprMax: 0.010 },
                    { dia: 12, rpm: 1170, iprMin: 0.009, iprMax: 0.012 }
                ]
            },
            
            // Material: Aluminum Alloys (5052, 7075)
            aluminum: {
                sfmRange: [265, 650],
                cuttingData: [
                    { dia: 2, rpm: 22200, iprMin: 0.0004, iprMax: 0.002 },
                    { dia: 3, rpm: 14800, iprMin: 0.001, iprMax: 0.004 },
                    { dia: 4, rpm: 11100, iprMin: 0.001, iprMax: 0.005 },
                    { dia: 6, rpm: 7400, iprMin: 0.001, iprMax: 0.007 },
                    { dia: 8, rpm: 5550, iprMin: 0.002, iprMax: 0.009 },
                    { dia: 10, rpm: 4440, iprMin: 0.002, iprMax: 0.012 },
                    { dia: 12, rpm: 3700, iprMin: 0.002, iprMax: 0.014 }
                ]
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // ADO-SUS Stainless Steel Drills
        // ─────────────────────────────────────────────────────────────────────
        adoSusDrills: {
            description: 'Advanced Performance Carbide Drills for Stainless Steels and Titanium Alloys',
            series: ['ADO-SUS-3D', 'ADO-SUS-5D'],
            coating: 'EgiAs',
            features: ['Optimized for stainless', 'Reduced thrust force'],
            
            stainless300Series: {
                sfmRange: [200, 330],
                hardnessRange: { max: 15, unit: 'HRC' },
                cuttingData: [
                    { dia: 2, rpm: 12850, iprMin: 0.0013, iprMax: 0.003 },
                    { dia: 3, rpm: 8570, iprMin: 0.002, iprMax: 0.005 },
                    { dia: 4, rpm: 6430, iprMin: 0.003, iprMax: 0.006 },
                    { dia: 6, rpm: 4280, iprMin: 0.005, iprMax: 0.008 },
                    { dia: 8, rpm: 3210, iprMin: 0.006, iprMax: 0.009 },
                    { dia: 10, rpm: 2570, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12, rpm: 2140, iprMin: 0.008, iprMax: 0.012 }
                ]
            },
            
            duplexStainless: {
                sfmRange: [130, 260],
                hardnessRange: { max: 30, unit: 'HRC' },
                cuttingData: [
                    { dia: 2, rpm: 9460, iprMin: 0.0013, iprMax: 0.003 },
                    { dia: 3, rpm: 6310, iprMin: 0.002, iprMax: 0.005 },
                    { dia: 4, rpm: 4730, iprMin: 0.003, iprMax: 0.006 },
                    { dia: 6, rpm: 3150, iprMin: 0.005, iprMax: 0.008 },
                    { dia: 8, rpm: 2360, iprMin: 0.006, iprMax: 0.009 },
                    { dia: 10, rpm: 1890, iprMin: 0.007, iprMax: 0.011 }
                ]
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // ADO-MICRO Micro Drills
        // ─────────────────────────────────────────────────────────────────────
        adoMicroDrills: {
            description: 'Advanced Performance Carbide Micro Drills',
            series: ['ADO-MICRO-2D', 'ADO-MICRO-5D', 'ADO-MICRO-12D', 'ADO-MICRO-20D', 'ADO-MICRO-30D'],
            diameterRange: { min: 0.7, max: 2, unit: 'mm' },
            
            carbonSteel: {
                sfmRange: [65, 195],
                cuttingData: [
                    { dia: 0.7, rpm: 18200, iprMin: 0.0003, iprMax: 0.0008 },
                    { dia: 1.0, rpm: 12700, iprMin: 0.0004, iprMax: 0.0012 },
                    { dia: 1.5, rpm: 8500, iprMin: 0.0006, iprMax: 0.0018 },
                    { dia: 2.0, rpm: 6400, iprMin: 0.0008, iprMax: 0.0024 }
                ]
            },
            
            titanium: {
                sfmRange: [130, 195],
                cuttingData: [
                    { dia: 0.7, rpm: 22700, iprMin: 0.0004, iprMax: 0.0007 },
                    { dia: 1.0, rpm: 15900, iprMin: 0.0006, iprMax: 0.001 },
                    { dia: 1.5, rpm: 10600, iprMin: 0.001, iprMax: 0.0015 },
                    { dia: 2.0, rpm: 8000, iprMin: 0.0012, iprMax: 0.002 }
                ]
            },
            
            inconel: {
                sfmRange: [15, 50],
                cuttingData: [
                    { dia: 0.7, rpm: 4500, iprMin: 0.0002, iprMax: 0.0006 },
                    { dia: 1.0, rpm: 3200, iprMin: 0.0002, iprMax: 0.0008 },
                    { dia: 1.5, rpm: 2100, iprMin: 0.0003, iprMax: 0.0012 },
                    { dia: 2.0, rpm: 1600, iprMin: 0.0004, iprMax: 0.0016 }
                ]
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // ADF Flat Drills
        // ─────────────────────────────────────────────────────────────────────
        adfFlatDrills: {
            description: 'Advanced Performance Flat Drills for curved surfaces and thin materials',
            pointAngle: 180,
            
            carbonSteel: {
                sfmRange: [100, 330],
                cuttingData: [
                    { dia: 2, rpm: 12850, iprMin: 0.0012, iprMax: 0.002 },
                    { dia: 3, rpm: 8570, iprMin: 0.002, iprMax: 0.003 },
                    { dia: 4, rpm: 6430, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 6, rpm: 4280, iprMin: 0.004, iprMax: 0.006 },
                    { dia: 8, rpm: 3210, iprMin: 0.005, iprMax: 0.008 },
                    { dia: 10, rpm: 2570, iprMin: 0.006, iprMax: 0.010 },
                    { dia: 12, rpm: 2140, iprMin: 0.007, iprMax: 0.012 }
                ]
            },
            
            hardenedSteel: {
                sfmRange: [65, 100],
                hardnessRange: { max: 50, unit: 'HRC' },
                cuttingData: [
                    { dia: 2, rpm: 4000, iprMin: 0.0008, iprMax: 0.002 },
                    { dia: 3, rpm: 2660, iprMin: 0.001, iprMax: 0.002 },
                    { dia: 4, rpm: 2000, iprMin: 0.002, iprMax: 0.003 },
                    { dia: 6, rpm: 1330, iprMin: 0.002, iprMax: 0.005 },
                    { dia: 8, rpm: 1000, iprMin: 0.003, iprMax: 0.006 },
                    { dia: 10, rpm: 800, iprMin: 0.004, iprMax: 0.008 }
                ]
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 2: ISCAR CUTTING TOOLS
    // Source: ISCAR PART 1.pdf (538 pages)
    // ═══════════════════════════════════════════════════════════════════════════
    
    iscar: {
        brand: 'ISCAR',
        country: 'Israel',
        website: 'www.iscar.com',
        catalogPages: 538,
        
        // ─────────────────────────────────────────────────────────────────────
        // Multi-Master Interchangeable Heads
        // ─────────────────────────────────────────────────────────────────────
        multiMaster: {
            description: 'Interchangeable Solid Carbide End Mill Heads',
            threadSizes: ['T04', 'T05', 'T06', 'T08', 'T10', 'T12'],
            coating: 'IC908',
            
            centeringDrills: {
                series: 'MM ECS',
                pointAngle: 120,
                models: [
                    { designation: 'MM ECS-A1.00X06-2T04', diameter: 0.042, shank: 'T04', length: 0.394 },
                    { designation: 'MM ECS-A1.60X06-2T04', diameter: 0.065, shank: 'T04', length: 0.394 },
                    { designation: 'MM ECS-A2.00X06-2T04', diameter: 0.081, shank: 'T04', length: 0.394 },
                    { designation: 'MM ECS-A3.15X08-2T05', diameter: 0.129, shank: 'T05', length: 0.591 },
                    { designation: 'MM ECS-A4.00X10-2T06', diameter: 0.162, shank: 'T06', length: 0.748 },
                    { designation: 'MM ECS-A5.00X12-2T08', diameter: 0.202, shank: 'T08', length: 0.906 },
                    { designation: 'MM ECS-A6.30X16-2T10', diameter: 0.254, shank: 'T10', length: 1.102 }
                ],
                
                cuttingData: {
                    alloySteel_24_29HRC: { sfm: 262, fzBase: 0.0008, note: '4340 24-29HRC' },
                    alloySteel_38_42HRC: { sfm: 213, fzBase: 0.0008, note: '4340 38-42HRC' },
                    stainless316L: { sfm: 164, fzBase: 0.0006, note: '316L MAX-215 HB' },
                    inconel718: { sfm: 49, fzBase: 0.0004, note: 'Inconel 718' }
                }
            },
            
            flatDrills: {
                series: 'MM ECDF',
                helixAngle: 30,
                flutes: 2,
                models: [
                    { designation: 'MM ECDF315A394-2T05', diameter: 0.315, fluteLength: 0.3937 },
                    { designation: 'MM ECDF394A472-2T06', diameter: 0.394, fluteLength: 0.4724 },
                    { designation: 'MM ECDF472A590-2T08', diameter: 0.472, fluteLength: 0.5906 },
                    { designation: 'MM ECDF630A787-2T10', diameter: 0.630, fluteLength: 0.7874 },
                    { designation: 'MM ECDF787A984-2T12', diameter: 0.787, fluteLength: 0.9842 }
                ],
                
                cuttingData: {
                    // Vc SFM, Feed IPR by diameter range
                    carbonSteel_annealed: {
                        sfmRange: [262, 459],
                        feedByDia: {
                            '0.314-0.389': { iprMin: 0.0031, iprMid: 0.0039, iprMax: 0.0047 },
                            '0.393-0.507': { iprMin: 0.0039, iprMid: 0.0047, iprMax: 0.0055 },
                            '0.511-0.625': { iprMin: 0.0047, iprMid: 0.0060, iprMax: 0.0070 },
                            '0.630-0.704': { iprMin: 0.0055, iprMid: 0.0066, iprMax: 0.0078 },
                            '0.708-1.0': { iprMin: 0.0070, iprMid: 0.0082, iprMax: 0.0094 }
                        }
                    },
                    lowAlloySteel_tempered: {
                        sfmRange: [196, 328],
                        feedByDia: {
                            '0.314-0.389': { iprMin: 0.0023, iprMid: 0.0031, iprMax: 0.0039 },
                            '0.393-0.507': { iprMin: 0.0023, iprMid: 0.0031, iprMax: 0.0039 },
                            '0.511-0.625': { iprMin: 0.0031, iprMid: 0.0039, iprMax: 0.0047 },
                            '0.630-0.704': { iprMin: 0.0039, iprMid: 0.0047, iprMax: 0.0055 },
                            '0.708-1.0': { iprMin: 0.0047, iprMid: 0.0055, iprMax: 0.0062 }
                        }
                    }
                }
            },
            
            counterBoring: {
                series: 'MM EFCB',
                flutes: 4,
                helixAngle: 30,
                models: [
                    { designation: 'MM EFCB110A08-4T06', diameter: 11.00, apMax: 8.40, shank: 'T06', fzMin: 0.03, fzMax: 0.04 },
                    { designation: 'MM EFCB140A11-4T08', diameter: 14.00, apMax: 11.50, shank: 'T08', fzMin: 0.04, fzMax: 0.05 }
                ]
            },
            
            spotDrills: {
                series: 'MM SPD',
                flutes: 3,
                helixAngle: 15,
                models: [
                    { designation: 'MM SPD315-31-3T06', diameter: 0.315, fluteLength: 0.4764 },
                    { designation: 'MM SPD394-39-3T08', diameter: 0.394, fluteLength: 0.5906 },
                    { designation: 'MM SPD472-47-3T08', diameter: 0.472, fluteLength: 0.6535 },
                    { designation: 'MM SPD630-63-3T12', diameter: 0.630, fluteLength: 0.9882 }
                ]
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 3: SANDVIK/SECO MILLING
    // Source: Milling 2018.1.pdf (752 pages)
    // ═══════════════════════════════════════════════════════════════════════════
    
    sandvik: {
        brand: 'Sandvik Coromant / Seco',
        country: 'Sweden',
        website: 'www.sandvik.coromant.com',
        catalogPages: 752,
        
        // Seco Material Groups (SMG)
        materialGroups: {
            P1: { name: 'Non-alloy steel, annealed', tensile: '<500 MPa', hb: '<150' },
            P2: { name: 'Non-alloy steel, normalized', tensile: '500-700 MPa', hb: '150-200' },
            P3: { name: 'Low alloy steel, annealed', tensile: '700-850 MPa', hb: '200-250' },
            P4: { name: 'Low alloy steel, normalized', tensile: '850-1000 MPa', hb: '250-300' },
            P5: { name: 'Medium alloy steel, annealed', tensile: '1000-1100 MPa', hb: '300-330' },
            P6: { name: 'Medium alloy steel, tempered', tensile: '1100-1200 MPa', hb: '330-350' },
            P7: { name: 'High alloy steel, annealed', tensile: '1200-1400 MPa', hb: '350-400' },
            P8: { name: 'High alloy steel, tempered', tensile: '1400-1600 MPa', hb: '400-450' },
            P11: { name: 'Tool steel, annealed', tensile: '>1200 MPa', hb: '>350' },
            P12: { name: 'Tool steel, hardened', tensile: '>1400 MPa', hb: '>400' },
            M1: { name: 'Austenitic stainless, soft', tensile: '<700 MPa', hb: '<200' },
            M2: { name: 'Austenitic stainless, med', tensile: '700-900 MPa', hb: '200-250' },
            M3: { name: 'Duplex stainless', tensile: '900-1100 MPa', hb: '250-330' },
            M4: { name: 'Super duplex stainless', tensile: '>1100 MPa', hb: '>330' },
            K1: { name: 'Grey cast iron, soft', tensile: '<200 MPa', hb: '<180' },
            K2: { name: 'Grey cast iron, med', tensile: '200-250 MPa', hb: '180-220' },
            K3: { name: 'Ductile cast iron, soft', tensile: '<400 MPa', hb: '<200' },
            K4: { name: 'Ductile cast iron, med', tensile: '400-600 MPa', hb: '200-280' },
            N1: { name: 'Aluminum wrought, non heat treated' },
            N2: { name: 'Aluminum wrought, heat treated' },
            N3: { name: 'Aluminum cast' },
            S1: { name: 'Heat resistant alloy, Ni-based, soft' },
            S2: { name: 'Heat resistant alloy, Ni-based, med' },
            S3: { name: 'Heat resistant alloy, Ni-based, hard' },
            S11: { name: 'Titanium, commercially pure' },
            S12: { name: 'Titanium alloy, alpha-beta' },
            S13: { name: 'Titanium alloy, beta' },
            H5: { name: 'Hardened steel 45-52 HRC' },
            H8: { name: 'Hardened steel 52-58 HRC' },
            H11: { name: 'Hardened steel 58-63 HRC' },
            H12: { name: 'Hardened steel >63 HRC' }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // Square Shoulder Milling R217/220.94
        // ─────────────────────────────────────────────────────────────────────
        squareShoulderMilling: {
            series: 'R217/220.94',
            insertSizes: ['08', '12'],
            
            insert08: {
                // fz = mm/tooth at different ae/DC percentages
                apMax: 4.0, // mm
                cuttingData: {
                    P1: { fz100: 0.11, fz30: 0.13, fz10: 0.19, insert: 'LOEX080408TR-M08 F40M' },
                    P2: { fz100: 0.12, fz30: 0.13, fz10: 0.20, insert: 'LOEX080408TR-M08 F40M' },
                    P3: { fz100: 0.11, fz30: 0.12, fz10: 0.19, insert: 'LOEX080408TR-M08 MP2500' },
                    P4: { fz100: 0.11, fz30: 0.12, fz10: 0.18, insert: 'LOEX080408TR-M08 MP2500' },
                    M1: { fz100: 0.12, fz30: 0.13, fz10: 0.20, insert: 'LOEX080408TR-M08 F40M' },
                    M2: { fz100: 0.11, fz30: 0.12, fz10: 0.18, insert: 'LOEX080408TR-M08 F40M' },
                    K1: { fz100: 0.12, fz30: 0.13, fz10: 0.20, insert: 'LOEX080408TR-MD08 MK2050' },
                    K2: { fz100: 0.11, fz30: 0.12, fz10: 0.18, insert: 'LOEX080408TR-MD08 MK2050' },
                    N1: { fz100: 0.15, fz30: 0.16, fz10: 0.26, insert: 'LOEX080408TR-M08 F40M' },
                    S1: { ap: 2.5, fz100: 0.075, fz30: 0.085, fz10: 0.13, insert: 'LOEX080408TR-M08 F40M' },
                    S11: { ap: 2.5, fz100: 0.085, fz30: 0.095, fz10: 0.15, insert: 'LOEX080408TR-M08 MS2050' }
                }
            },
            
            insert12: {
                apMax: 6.0, // mm
                cuttingData: {
                    P1: { fz100: 0.18, fz30: 0.20, fz10: 0.30, insert: 'LOEX120708TR-M12 F40M' },
                    P2: { fz100: 0.19, fz30: 0.20, fz10: 0.32, insert: 'LOEX120708TR-M12 F40M' },
                    P3: { fz100: 0.18, fz30: 0.19, fz10: 0.30, insert: 'LOEX120708TR-M12 MP2500' },
                    M1: { ap: 6.0, fz100: 0.14, fz30: 0.16, fz10: 0.24, insert: 'LOEX120708R-M09 MS2050' },
                    M2: { ap: 6.0, fz100: 0.13, fz30: 0.14, fz10: 0.22, insert: 'LOEX120708R-M09 MS2050' },
                    K1: { fz100: 0.20, fz30: 0.22, fz10: 0.34, insert: 'LOEX120708TR-MD13 MK2050' },
                    N1: { fz100: 0.18, fz30: 0.20, fz10: 0.30, insert: 'LOEX120708R-M09 F40M' },
                    S1: { ap: 3.5, fz100: 0.095, fz30: 0.10, fz10: 0.16, insert: 'LOEX120708R-M09 MS2050' }
                }
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // Helical Milling R217/220.69
        // ─────────────────────────────────────────────────────────────────────
        helicalMilling: {
            series: 'R217/220.69',
            insertSizes: ['06', '10', '12', '18'],
            
            insert06: {
                cuttingData: {
                    P1: { fz100: 0.055, fz30: 0.060, fz10: 0.095, insert: 'XOMX060204R-M05 F40M' },
                    P3: { fz100: 0.055, fz30: 0.060, fz10: 0.090, insert: 'XOMX060204R-M05 F40M' },
                    M1: { fz100: 0.055, fz30: 0.065, fz10: 0.095, insert: 'XOMX060204R-M05 F40M' },
                    M3: { fz100: 0.042, fz30: 0.046, fz10: 0.070, insert: 'XOMX060204R-M05 F40M' },
                    K1: { fz100: 0.055, fz30: 0.065, fz10: 0.095, insert: 'XOMX060204R-M05 MP3000' },
                    N1: { fz100: 0.060, fz30: 0.065, fz10: 0.10, insert: 'XOEX060204FR-E03 H15' },
                    S1: { fz100: 0.036, fz30: 0.040, fz10: 0.060, insert: 'XOMX060204R-M05 F40M' }
                }
            },
            
            insert10: {
                cuttingData: {
                    P1: { fz100: 0.090, fz30: 0.10, fz10: 0.15, insert: 'XOMX10T308TR-ME07 F40M' },
                    P4: { fz100: 0.095, fz30: 0.10, fz10: 0.16, insert: 'XOMX10T308TR-M09 MP2500' },
                    M1: { fz100: 0.070, fz30: 0.075, fz10: 0.12, insert: 'XOEX10T308R-M06 F40M' },
                    K1: { fz100: 0.10, fz30: 0.11, fz10: 0.17, insert: 'XOMX10T308TR-M09 MK2050' },
                    N1: { fz100: 0.075, fz30: 0.080, fz10: 0.12, insert: 'XOEX10T308FR-E05 H15' },
                    S1: { fz100: 0.044, fz30: 0.048, fz10: 0.075, insert: 'XOEX10T308R-M06 F40M' },
                    H5: { fz100: 0.065, fz30: 0.070, fz10: 0.11, insert: 'XOMX10T308TR-M09 MP1500' }
                }
            },
            
            insert12: {
                cuttingData: {
                    P1: { fz100: 0.12, fz30: 0.13, fz10: 0.20, insert: 'XOMX120408TR-ME08 F40M' },
                    P4: { fz100: 0.14, fz30: 0.15, fz10: 0.22, insert: 'XOMX120408TR-M12 MP2500' },
                    M1: { fz100: 0.10, fz30: 0.11, fz10: 0.17, insert: 'XOEX120408R-M07 F40M' },
                    K1: { fz100: 0.15, fz30: 0.16, fz10: 0.24, insert: 'XOMX120408TR-M12 MK2050' },
                    N1: { fz100: 0.11, fz30: 0.12, fz10: 0.18, insert: 'XOEX120408FR-E06 H15' },
                    S1: { fz100: 0.065, fz30: 0.070, fz10: 0.11, insert: 'XOEX120408R-M07 F40M' },
                    H5: { fz100: 0.10, fz30: 0.11, fz10: 0.17, insert: 'XOMX120408TR-MD13 MP1500' }
                }
            },
            
            insert18: {
                cuttingData: {
                    P1: { fz100: 0.15, fz30: 0.16, fz10: 0.24, insert: 'XOMX180608TR-ME13 F40M' },
                    P4: { fz100: 0.15, fz30: 0.16, fz10: 0.24, insert: 'XOMX180608TR-M14 MP2500' },
                    M1: { fz100: 0.16, fz30: 0.17, fz10: 0.26, insert: 'XOMX180608TR-M14 F40M' },
                    K1: { fz100: 0.16, fz30: 0.17, fz10: 0.26, insert: 'XOMX180608TR-M14 MK2050' },
                    N1: { fz100: 0.15, fz30: 0.16, fz10: 0.24, insert: 'XOEX180608FR-E10 H25' },
                    S1: { fz100: 0.075, fz30: 0.080, fz10: 0.12, insert: 'XOMX180608R-M10 F40M' },
                    H5: { fz100: 0.11, fz30: 0.12, fz10: 0.18, insert: 'XOMX180608TR-MD15 MP1500' }
                }
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 4: EMUGE THREADING
    // Source: ZK12023_DEGB RevA EMUGE Katalog 160.pdf (808 pages)
    // ═══════════════════════════════════════════════════════════════════════════
    
    emuge: {
        brand: 'EMUGE',
        country: 'Germany',
        website: 'www.emuge.com',
        catalogPages: 808,
        
        // Material Classification for Tapping
        materialClassification: {
            P: {
                name: 'Steel materials',
                subgroups: {
                    '1.1': { desc: 'Cold-extrusion/Construction steels', tensile: '≤600 N/mm²', examples: ['Cq15', 'S235JR'] },
                    '2.1': { desc: 'Construction/Cementation steels', tensile: '≤800 N/mm²', examples: ['E360', '16MnCr5'] },
                    '3.1': { desc: 'Heat-treatable/Cold work steels', tensile: '≤1000 N/mm²', examples: ['42CrMo4', '102Cr6'] },
                    '4.1': { desc: 'Heat-treatable/Nitriding steels', tensile: '≤1200 N/mm²', examples: ['50CrMo4', '31CrMo12'] },
                    '5.1': { desc: 'High-alloyed/Hot work steels', tensile: '≤1400 N/mm²', examples: ['X38CrMoV5-3', 'X40CrMoV5-1'] }
                }
            },
            M: {
                name: 'Stainless steel materials',
                subgroups: {
                    '1.1': { desc: 'Ferritic/Martensitic', tensile: '≤950 N/mm²', examples: ['X2CrTi12'] },
                    '2.1': { desc: 'Austenitic', tensile: '≤950 N/mm²', examples: ['X6CrNiMoTi17-12-2'] },
                    '3.1': { desc: 'Duplex', tensile: '≤1100 N/mm²', examples: ['X2CrNiMoN22-5-3'] },
                    '4.1': { desc: 'Super Duplex', tensile: '≤1250 N/mm²', examples: ['X2CrNiMoN25-7-4'] }
                }
            },
            K: {
                name: 'Cast materials',
                subgroups: {
                    '1.1': { desc: 'Grey cast iron (GJL)', tensile: '100-250 N/mm²', examples: ['EN-GJL-200'] },
                    '1.2': { desc: 'Grey cast iron (GJL)', tensile: '250-450 N/mm²', examples: ['EN-GJL-300'] },
                    '2.1': { desc: 'Ductile cast iron (GJS)', tensile: '350-500 N/mm²', examples: ['EN-GJS-400-15'] },
                    '2.2': { desc: 'Ductile cast iron (GJS)', tensile: '500-900 N/mm²', examples: ['EN-GJS-700-2'] },
                    '3.1': { desc: 'Vermicular cast iron (GJV)', tensile: '300-400 N/mm²', examples: ['GJV 300'] },
                    '4.1': { desc: 'Malleable cast iron', tensile: '250-500 N/mm²', examples: ['EN-GJMW-350-4'] }
                }
            },
            N: {
                name: 'Non-ferrous materials',
                subgroups: {
                    '1.1': { desc: 'Aluminum wrought', tensile: '≤200 N/mm²' },
                    '1.2': { desc: 'Aluminum wrought', tensile: '≤350 N/mm²' },
                    '1.3': { desc: 'Aluminum wrought', tensile: '≤550 N/mm²' },
                    '1.4': { desc: 'Aluminum cast Si≤7%' },
                    '1.5': { desc: 'Aluminum cast 7%<Si≤12%' },
                    '1.6': { desc: 'Aluminum cast 12%<Si≤17%' },
                    '2.1': { desc: 'Pure copper', tensile: '≤400 N/mm²' },
                    '2.2': { desc: 'Brass long-chipping', tensile: '≤550 N/mm²' },
                    '2.3': { desc: 'Brass short-chipping', tensile: '≤550 N/mm²' },
                    '2.4': { desc: 'Aluminum bronze', tensile: '≤800 N/mm²' },
                    '2.5': { desc: 'Tin bronze long-chipping', tensile: '≤700 N/mm²' }
                }
            }
        },
        
        // Taptor Drill-Threading Technology
        taptor: {
            description: 'Pre-drilling and threading in one single working step',
            advantages: [
                'Time saving in internal thread production',
                'Eliminates tool change',
                'Reduced machine capacity requirements'
            ],
            materials: ['Aluminum cast alloys with ≥7% Si', 'Magnesium alloys'],
            maxDepth: '8 x D',
            diameterRange: { min: 3.3, max: 12, unit: 'mm' }
        },
        
        // High Feed Drilling
        highFeedDrilling: {
            characteristics: [
                'Drilling depth up to approx. 8 x D',
                'Good centering capability',
                'Tool life comparable with conventional tools',
                'MQL possible'
            ],
            diameterRange: { min: 3.3, max: 12, unit: 'mm' }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 5: HAIMER SAFE-LOCK & TOOL HOLDERS (Additional)
    // Source: Haimer USA Master Catalog.pdf (862 pages)
    // ═══════════════════════════════════════════════════════════════════════════
    
    haimerSafeLock: {
        brand: 'HAIMER',
        system: 'Safe-Lock',
        
        description: 'Pull-out protection system for high performance cutting',
        
        advantages: [
            'No tool pull out',
            'No twisting',
            'High accuracy clamping (shrink fit or collet)',
            'High torque via form closed clamping',
            'Maximum metal removal rate with process reliability'
        ],
        
        specifications: {
            runoutAccuracy: { value: 0.003, unit: 'mm', note: '< 3 μm' },
            balanceQuality: 'Repeatable',
            compatibleHolders: ['Shrink fit', 'Collet chuck'],
            toolAdjustment: 'Shiftable within Safe-Lock groove'
        },
        
        comparisonToWeldon: {
            weldonRunout: { value: 0.05, unit: 'mm', note: 'Poor due to side clamping' },
            safeLockRunout: { value: 0.003, unit: 'mm', note: 'High precision' },
            weldonBalance: 'Inconsistent',
            safeLockBalance: 'Repeatable'
        },
        
        faq: [
            { q: 'Can Safe-Lock shank be clamped in holder without Safe-Lock pins?', a: 'Yes, in any frictional tool holder' },
            { q: 'Is length adjustable?', a: 'Yes, shiftable within the Safe-Lock groove' },
            { q: 'How to shrink in?', a: 'Put in heated holder with twisting movement' }
        ]
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Get OSG drill cutting data by material and diameter
    getOsgDrillData: function(material, diameter) {
        const matMap = {
            'carbon_steel': 'carbonSteel',
            'alloy_steel': 'alloySteel',
            'stainless': 'stainlessSteel',
            'titanium': 'titanium',
            'inconel': 'inconel',
            'cast_iron': 'castIron',
            'aluminum': 'aluminum',
            'hardened_26_30': 'hardenedSteel_26_30',
            'hardened_30_34': 'hardenedSteel_30_34',
            'hardened_34_43': 'hardenedSteel_34_43'
        };
        
        const matKey = matMap[material];
        if (!matKey || !this.osg.adoCarbideDrills[matKey]) return null;
        
        const matData = this.osg.adoCarbideDrills[matKey];
        const cuttingData = matData.cuttingData;
        
        // Find closest diameter
        let closest = cuttingData[0];
        let minDiff = Math.abs(cuttingData[0].dia - diameter);
        
        for (const data of cuttingData) {
            const diff = Math.abs(data.dia - diameter);
            if (diff < minDiff) {
                minDiff = diff;
                closest = data;
            }
        }
        
        return {
            material: material,
            requestedDia: diameter,
            matchedDia: closest.dia,
            sfmRange: matData.sfmRange,
            rpm: closest.rpm,
            iprRange: [closest.iprMin, closest.iprMax]
        };
    },
    
    // Get Sandvik milling data by material group and insert size
    getSandvikMillingData: function(materialGroup, insertSize, millingType = 'helical') {
        const series = millingType === 'helical' ? this.sandvik.helicalMilling : this.sandvik.squareShoulderMilling;
        const insertKey = `insert${insertSize}`;
        
        if (!series[insertKey] || !series[insertKey].cuttingData[materialGroup]) {
            return null;
        }
        
        return {
            series: series.series,
            insertSize: insertSize,
            materialGroup: materialGroup,
            materialInfo: this.sandvik.materialGroups[materialGroup],
            cuttingData: series[insertKey].cuttingData[materialGroup]
        };
    },
    
    // Get EMUGE material classification
    getEmugeMaterialClass: function(materialType, subgroup) {
        if (!this.emuge.materialClassification[materialType]) return null;
        if (!this.emuge.materialClassification[materialType].subgroups[subgroup]) return null;
        
        return {
            type: materialType,
            typeName: this.emuge.materialClassification[materialType].name,
            subgroup: subgroup,
            ...this.emuge.materialClassification[materialType].subgroups[subgroup]
        };
    },
    
    // Get statistics
    getStats: function() {
        return {
            version: this.version,
            batch: this.batch,
            manufacturers: ['OSG', 'ISCAR', 'Sandvik/Seco', 'EMUGE', 'HAIMER Safe-Lock'],
            osgDrillSeries: this.osg.adoCarbideDrills.series.length,
            osgMaterials: Object.keys(this.osg.adoCarbideDrills).filter(k => k !== 'series' && k !== 'coating' && k !== 'features' && k !== 'pointAngle').length,
            iscarMultiMasterTypes: Object.keys(this.iscar.multiMaster).length,
            sandvikMaterialGroups: Object.keys(this.sandvik.materialGroups).length,
            emugeMaterialTypes: Object.keys(this.emuge.materialClassification).length
        };
    }
};
