const PRISM_220_COURSE_CATALOG = {
    version: '1.0.0',
    totalCourses: 220,
    lastUpdated: '2026-01-18',
    
    // Course utilization tracking
    utilizationTargets: {
        target: 100, // 100% utilization goal
        current: 0,  // Will be calculated
        byUniversity: {}
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // MIT COURSES (85 COURSES)
    // ═══════════════════════════════════════════════════════════════════════════
    MIT: [
        // TIER 1: FULLY APPLIED (100% utilization target)
        { id: '18.433', name: 'Combinatorial Optimization', tier: 1, util: 100, algs: ['simplex','hungarian','branch_bound','network_flow'] },
        { id: '18.S191', name: 'Julia Programming', tier: 1, util: 100, algs: ['parallel_map','gpu_compute','autodiff'] },
        { id: '6.251J', name: 'Mathematical Programming', tier: 1, util: 100, algs: ['simplex','interior_point','duality','sensitivity'] },
        { id: '6.830', name: 'Database Systems', tier: 1, util: 100, algs: ['btree','hash_join','query_opt','indexing'] },
        { id: '15.099', name: 'Optimization Methods', tier: 1, util: 100, algs: ['gradient_descent','newton','bfgs','conjugate_gradient'] },
        { id: '3.22', name: 'Mechanical Behavior of Materials', tier: 1, util: 100, algs: ['stress_strain','fatigue','fracture_mechanics','creep'] },
        { id: '2.001', name: 'Mechanics & Materials I', tier: 1, util: 100, algs: ['beam_deflection','stress_analysis','mohr_circle'] },
        { id: '2.14', name: 'Feedback Control Systems', tier: 1, util: 100, algs: ['pid','state_space','root_locus','bode'] },
        { id: '6.241J', name: 'Dynamic Systems and Control', tier: 1, util: 100, algs: ['kalman','lqr','pole_placement','observability'] },
        { id: '6.036', name: 'Intro Machine Learning', tier: 1, util: 100, algs: ['linear_reg','svm','neural_net','perceptron'] },
        { id: '6.867', name: 'Advanced Machine Learning', tier: 1, util: 100, algs: ['deep_learning','cnn','rnn','regularization'] },
        { id: '18.06', name: 'Linear Algebra', tier: 1, util: 100, algs: ['svd','eigendecomp','qr_factorization','lu_decomp'] },
        { id: '2.008', name: 'Design and Manufacturing II', tier: 1, util: 100, algs: ['cam_toolpath','gcode_gen','process_planning'] },
        { id: '2.158J', name: 'Computational Geometry', tier: 1, util: 100, algs: ['voronoi','delaunay','convex_hull','polygon_ops'] },
        { id: '6.837', name: 'Computer Graphics', tier: 1, util: 100, algs: ['ray_tracing','rasterization','shading','bezier'] },
        
        // TIER 2: FUTURE PHASES (85-95% utilization target)
        { id: '15.773', name: 'Hands-on Deep Learning', tier: 2, util: 95, algs: ['transformer','attention','bert','gpt'] },
        { id: 'RES.6-013', name: 'AI 101 Workshop', tier: 2, util: 85, algs: ['ml_basics','nn_fundamentals','data_prep'] },
        { id: '18.657', name: 'Mathematics of ML', tier: 2, util: 90, algs: ['kernel_methods','pac_learning','vc_dim'] },
        { id: '18.409', name: 'Algorithmic Aspects of ML', tier: 2, util: 85, algs: ['online_learning','bandits','regret_bounds'] },
        { id: '6.005', name: 'Software Construction', tier: 2, util: 90, algs: ['design_patterns','testing','specification'] },
        { id: '6.171', name: 'Software Engineering Web', tier: 2, util: 85, algs: ['mvc','rest_api','websockets'] },
        { id: '16.355J', name: 'Software Engineering Concepts', tier: 2, util: 80, algs: ['uml','agile','requirements'] },
        { id: '6.831', name: 'User Interface Design', tier: 2, util: 90, algs: ['fitts_law','hicks_law','usability','a11y'] },
        { id: '6.871', name: 'Knowledge-Based Systems', tier: 2, util: 95, algs: ['expert_system','inference_engine','forward_chain'] },
        { id: '15.792J', name: 'Proseminar in Manufacturing', tier: 2, util: 80, algs: ['process_planning','shop_floor'] },
        { id: '16.A47', name: 'Engineer of 2020', tier: 2, util: 70, algs: ['leadership_models','systems_thinking'] },
        { id: '2.670', name: 'ME Tools', tier: 2, util: 85, algs: ['measurement','tolerance_analysis'] },
        { id: '15.066J', name: 'System Optimization Mfg', tier: 2, util: 90, algs: ['factory_sim','bottleneck','lean'] },
        { id: '2.003J', name: 'Dynamics and Control I', tier: 2, util: 90, algs: ['vibration','modal_analysis','transfer_fn'] },
        { id: 'RES.16-002', name: 'How to CAD', tier: 2, util: 95, algs: ['cad_modeling','parametric','assembly'] },
        { id: '2.854', name: 'Intro Manufacturing Systems', tier: 2, util: 95, algs: ['production_planning','scheduling','mrp'] },
        { id: '2.75', name: 'Precision Machine Design', tier: 2, util: 100, algs: ['error_budget','thermal_analysis','kinematic_design'] },
        { id: '15.769', name: 'Operations Strategy', tier: 2, util: 80, algs: ['capacity_planning','operations_model'] },
        { id: 'MAS.965', name: 'Relational Machines', tier: 2, util: 75, algs: ['hci_models','interaction_design'] },
        { id: '2.830J', name: 'Control of Mfg Processes', tier: 2, util: 95, algs: ['spc','adaptive_control','process_model'] },
        
        // TIER 3: PDF EXTRACTED (70-85% utilization target)
        { id: '6.046J', name: 'Design & Analysis of Algorithms', tier: 3, util: 90, algs: ['dynamic_programming','greedy','graph','amortized'] },
        { id: '18.02', name: 'Multivariable Calculus', tier: 3, util: 85, algs: ['gradient','jacobian','hessian','lagrange_mult'] },
        { id: '18.100A', name: 'Real Analysis', tier: 3, util: 75, algs: ['convergence','continuity','measure_theory'] },
        { id: '18.112', name: 'Complex Variables', tier: 3, util: 70, algs: ['conformal_mapping','residue_calc'] },
        { id: '18.725', name: 'Algebraic Geometry', tier: 3, util: 80, algs: ['algebraic_curves','varieties','bezout'] },
        { id: '18.901', name: 'Intro to Topology', tier: 3, util: 85, algs: ['persistent_homology','simplicial','betti'] },
        { id: '18.904', name: 'Seminar in Topology', tier: 3, util: 70, algs: ['covering_spaces','fundamental_group'] },
        { id: '18.905', name: 'Algebraic Topology I', tier: 3, util: 80, algs: ['homology','cohomology','exact_sequences'] },
        { id: '18.906', name: 'Algebraic Topology II', tier: 3, util: 75, algs: ['spectral_sequences','sheaves'] },
        { id: '18.917', name: 'Topics Algebraic Topology', tier: 3, util: 70, algs: ['k_theory','characteristic_classes'] },
        { id: '18.966', name: 'Geometry of Manifolds', tier: 3, util: 75, algs: ['differential_forms','curvature'] },
        { id: '18.S190', name: 'Intro Metric Spaces', tier: 3, util: 70, algs: ['metric_topology','completeness'] },
        { id: '3.40J', name: 'Physical Metallurgy', tier: 3, util: 90, algs: ['phase_diagrams','precipitation','tttt_curves'] },
        
        // TIER 4: ADDITIONAL (60-80% utilization target)
        { id: '6.506', name: 'Algorithm Engineering', tier: 4, util: 80, algs: ['cache_oblivious','external_memory','io_efficient'] },
        { id: '3.21', name: 'Kinetic Processes Materials', tier: 4, util: 75, algs: ['diffusion','phase_transform','nucleation'] },
        { id: '3.042', name: 'Materials Project Lab', tier: 4, util: 70, algs: ['characterization','testing'] },
        { id: '1.105', name: 'Solid Mechanics Lab', tier: 4, util: 70, algs: ['strain_gauge','photoelasticity'] },
        { id: '9.52-C', name: 'Computational Cognitive Sci', tier: 4, util: 65, algs: ['cognitive_models','bayesian_cognition'] },
        { id: '10.675J', name: 'Computational Quantum Mech', tier: 4, util: 60, algs: ['dft','hartree_fock','molecular_dynamics'] },
        { id: '15.872', name: 'System Dynamics II', tier: 4, util: 75, algs: ['system_dynamics','feedback_loops','stocks_flows'] },
        { id: '15.875', name: 'Applications System Dynamics', tier: 4, util: 70, algs: ['policy_modeling','simulation'] },
        { id: '6.096', name: 'Introduction to C++', tier: 4, util: 80, algs: ['oop','templates','stl'] },
        { id: '18.S096', name: 'Topics in Math Finance', tier: 4, util: 80, algs: ['black_scholes','monte_carlo_finance','greeks'] },
        { id: 'RES.LL-005', name: 'D4M Big Data & ML', tier: 4, util: 85, algs: ['sparse_matrix','graph_analytics','associative_arrays'] },
        { id: '6.042J', name: 'Math for CS', tier: 4, util: 90, algs: ['proofs','combinatorics','probability','graph_theory'] },
        { id: '11.205', name: 'Intro Spatial Analysis', tier: 4, util: 70, algs: ['gis','spatial_clustering','kriging'] },
        { id: '3.016', name: 'Math for Materials Scientists', tier: 4, util: 75, algs: ['tensor_analysis','symmetry'] },
        { id: '18.404J', name: 'Theory of Computation', tier: 4, util: 75, algs: ['automata','turing_machines','complexity'] },
        { id: '15.060', name: 'Data Models Decisions', tier: 4, util: 80, algs: ['decision_trees','bayesian_decision','utility'] },
        { id: '10.490', name: 'Integrated Chemical Eng', tier: 4, util: 65, algs: ['process_integration','heat_exchanger'] },
        { id: '6.892', name: 'Computational Discourse', tier: 4, util: 65, algs: ['nlp_discourse','coreference'] },
        { id: '10.34', name: 'Numerical Methods', tier: 4, util: 85, algs: ['ode_solvers','pde_methods','finite_diff'] },
        { id: '18.086', name: 'Computational Science', tier: 4, util: 95, algs: ['fft','spectral_methods','fea','finite_element'] },
        { id: '2.004', name: 'Dynamics and Control II', tier: 4, util: 90, algs: ['nyquist','bode','state_feedback','lead_lag'] },
        { id: '18.337J', name: 'Parallel Computing', tier: 4, util: 80, algs: ['mpi','cuda','parallel_algorithms','openmp'] },
        
        // TIER 5: NEW ADDITIONS (50-70% utilization target)
        { id: '6.172', name: 'Performance Engineering', tier: 5, util: 75, algs: ['cache_optimization','simd','profiling'] },
        { id: '6.824', name: 'Distributed Systems', tier: 5, util: 70, algs: ['raft','paxos','mapreduce','consistent_hashing'] },
        { id: '6.828', name: 'Operating System Eng', tier: 5, util: 65, algs: ['scheduling','memory_management','virtualization'] },
        { id: '6.869', name: 'Advances Computer Vision', tier: 5, util: 80, algs: ['object_detection','segmentation','tracking'] },
        { id: '6.S081', name: 'Operating Systems', tier: 5, util: 65, algs: ['virtual_memory','file_systems','concurrency'] },
        { id: '15.053', name: 'Optimization in Business', tier: 5, util: 75, algs: ['linear_programming','sensitivity_analysis'] },
        { id: '15.760', name: 'Operations Management', tier: 5, util: 80, algs: ['inventory_control','queuing','newsvendor'] },
        { id: '15.778', name: 'Management Supply Networks', tier: 5, util: 75, algs: ['supply_chain_opt','bullwhip'] },
        { id: '16.30', name: 'Feedback Control Systems', tier: 5, util: 80, algs: ['robust_control','h_infinity','mu_synthesis'] },
        { id: '16.36', name: 'Communication Systems', tier: 5, util: 65, algs: ['signal_processing','modulation'] },
        { id: '2.087', name: 'Engineering Math', tier: 5, util: 80, algs: ['laplace','fourier','pde_solutions'] },
        { id: '15.963', name: 'Product Development', tier: 5, util: 75, algs: ['dfm','qfd','concurrent_eng'] },
        { id: '2.810', name: 'Manufacturing Processes', tier: 5, util: 85, algs: ['cutting_mechanics','forming','joining'] },
        { id: '2.852', name: 'Manufacturing Systems Analysis', tier: 5, util: 80, algs: ['simulation','lean','toc'] },
        { id: '2.882', name: 'System Design & Analysis', tier: 5, util: 75, algs: ['system_architecture','trade_studies'] },
        { id: '6.034', name: 'Artificial Intelligence', tier: 5, util: 90, algs: ['search','game_playing','constraint_prop'] },
        { id: '16.410', name: 'Autonomous Systems', tier: 5, util: 90, algs: ['astar','mcts','mdp','pomdp'] }
    ],

    // ═══════════════════════════════════════════════════════════════════════════
    // STANFORD COURSES (25 COURSES)
    // ═══════════════════════════════════════════════════════════════════════════
    STANFORD: [
        { id: 'CS223A', name: 'Introduction to Robotics', tier: 1, util: 95, algs: ['forward_kinematics','inverse_kinematics','jacobian','dynamics'] },
        { id: 'EE263', name: 'Linear Dynamical Systems', tier: 1, util: 95, algs: ['state_space','controllability','observability','svd'] },
        { id: 'CS229', name: 'Machine Learning', tier: 1, util: 100, algs: ['linear_regression','logistic','svm','em','pca'] },
        { id: 'CS348A', name: 'Geometric Modeling', tier: 1, util: 95, algs: ['nurbs','bspline','subdivision','trimmed_surfaces'] },
        { id: 'CS468', name: 'Geometry Processing', tier: 1, util: 90, algs: ['mesh_processing','parameterization','remeshing'] },
        { id: 'ME318', name: 'Computer-Aided Product', tier: 2, util: 85, algs: ['cad_integration','pmi','model_based'] },
        { id: 'CS224', name: 'Advanced Algorithms', tier: 2, util: 85, algs: ['approximation','randomized','streaming'] },
        { id: 'ME127', name: 'Design for Manufacturing', tier: 2, util: 90, algs: ['dfm_rules','topology_opt','generative'] },
        { id: 'ME129', name: 'Manufacturing Economics', tier: 2, util: 80, algs: ['cost_modeling','break_even','npv'] },
        { id: 'CS143', name: 'Compilers', tier: 2, util: 85, algs: ['lexing','parsing','code_gen','optimization'] },
        { id: 'CS243', name: 'Advanced Compiling', tier: 3, util: 75, algs: ['optimization_passes','ssa','register_alloc'] },
        { id: 'CS231N', name: 'Deep Learning Vision', tier: 1, util: 95, algs: ['cnn','resnet','yolo','segmentation'] },
        { id: 'CS221', name: 'Artificial Intelligence', tier: 1, util: 95, algs: ['search','csp','mdp','game_theory'] },
        { id: 'CS234', name: 'Reinforcement Learning', tier: 2, util: 90, algs: ['q_learning','policy_gradient','actor_critic','ppo'] },
        { id: 'CS224N', name: 'NLP Deep Learning', tier: 2, util: 90, algs: ['word2vec','lstm','transformer','bert'] },
        { id: 'CS230', name: 'Deep Learning', tier: 2, util: 90, algs: ['backprop','regularization','hyperparameter'] },
        { id: 'CS140', name: 'Operating Systems', tier: 3, util: 70, algs: ['threading','synchronization','deadlock'] },
        { id: 'CS161', name: 'Design Analysis Algorithms', tier: 2, util: 90, algs: ['divide_conquer','dp','greedy','np'] },
        { id: 'CS245', name: 'Database System Principles', tier: 3, util: 80, algs: ['query_optimization','indexing','transactions'] },
        { id: 'CS326', name: 'Topics in AI', tier: 3, util: 75, algs: ['advanced_ml','meta_learning'] },
        { id: 'CS327A', name: 'Advanced Robotics', tier: 2, util: 85, algs: ['motion_planning','manipulation','force_control'] },
        { id: 'ME210', name: 'Intro Mechatronics', tier: 3, util: 80, algs: ['sensor_fusion','actuator_control','embedded'] },
        { id: 'ME220', name: 'Intro Sensors', tier: 3, util: 75, algs: ['signal_conditioning','calibration'] },
        { id: 'ME352', name: 'Machine Design', tier: 2, util: 85, algs: ['fatigue_analysis','bearing_selection','gear_design'] },
        { id: 'AA222', name: 'MDO', tier: 2, util: 90, algs: ['mdo','pareto_optimization','surrogate_model'] }
    ],

    // ═══════════════════════════════════════════════════════════════════════════
    // CMU COURSES (18 COURSES)
    // ═══════════════════════════════════════════════════════════════════════════
    CMU: [
        { id: '15-213', name: 'Computer Systems', tier: 1, util: 90, algs: ['memory_management','linking','cache'] },
        { id: '15-418', name: 'Parallel Computing', tier: 2, util: 85, algs: ['gpu_programming','parallel_patterns','simd'] },
        { id: '10-601', name: 'Machine Learning', tier: 1, util: 95, algs: ['naive_bayes','decision_trees','nn','ensemble'] },
        { id: '10-701', name: 'Advanced Machine Learning', tier: 2, util: 90, algs: ['graphical_models','variational','mcmc'] },
        { id: '16-385', name: 'Computer Vision', tier: 2, util: 90, algs: ['feature_detection','stereo','optical_flow','sfm'] },
        { id: '24-681', name: 'CAD & Applications', tier: 1, util: 95, algs: ['solid_modeling','nurbs_surfaces','boolean_ops'] },
        { id: '15-462', name: 'Computer Graphics', tier: 2, util: 85, algs: ['rendering','animation','shading'] },
        { id: '10-725', name: 'Convex Optimization', tier: 2, util: 90, algs: ['cvxpy','proximal','admm'] },
        { id: '16-720', name: 'Computer Vision', tier: 2, util: 85, algs: ['recognition','tracking','3d_vision'] },
        { id: '18-661', name: 'Intro Machine Learning', tier: 2, util: 85, algs: ['clustering','dim_reduction','svm'] },
        { id: '15-451', name: 'Algorithm Design', tier: 2, util: 90, algs: ['network_flow','linear_programming','matching'] },
        { id: '15-859', name: 'Algorithms Big Data', tier: 3, util: 75, algs: ['streaming_algorithms','sketching'] },
        { id: '36-705', name: 'Intermediate Statistics', tier: 3, util: 80, algs: ['hypothesis_testing','regression'] },
        { id: '06-262', name: 'Mathematical Methods', tier: 3, util: 75, algs: ['numerical_integration','pde'] },
        { id: '24-351', name: 'Manufacturing Processes', tier: 2, util: 85, algs: ['material_removal','forming','casting'] },
        { id: '24-682', name: 'Computer-Aided Design', tier: 2, util: 90, algs: ['parametric_modeling','feature_based'] },
        { id: '16-811', name: 'Math Fundamentals Robotics', tier: 3, util: 80, algs: ['lie_groups','manifolds','screw_theory'] },
        { id: '24-785', name: 'Engineering Optimization', tier: 2, util: 90, algs: ['constrained_opt','genetic_algorithms','moo'] }
    ],

    // ═══════════════════════════════════════════════════════════════════════════
    // BERKELEY COURSES (15 COURSES)
    // ═══════════════════════════════════════════════════════════════════════════
    BERKELEY: [
        { id: 'CS170', name: 'Efficient Algorithms', tier: 1, util: 95, algs: ['fft','np_complete','approximation','dp'] },
        { id: 'CS188', name: 'Artificial Intelligence', tier: 1, util: 95, algs: ['adversarial_search','bayesian_networks','mdp'] },
        { id: 'CS189', name: 'Machine Learning', tier: 1, util: 95, algs: ['kernel_svm','neural_networks','boosting'] },
        { id: 'ME102B', name: 'Mechatronics Design', tier: 2, util: 85, algs: ['pid_tuning','sensor_integration'] },
        { id: 'ME232', name: 'Advanced Control', tier: 2, util: 90, algs: ['mpc','adaptive_control','nonlinear'] },
        { id: 'EECS127', name: 'Optimization Models', tier: 2, util: 90, algs: ['lp','qp','socp','semidefinite'] },
        { id: 'CS61B', name: 'Data Structures', tier: 1, util: 95, algs: ['trees','graphs','hashing','heaps'] },
        { id: 'CS61C', name: 'Machine Structures', tier: 2, util: 80, algs: ['pipelining','cache','risc_v'] },
        { id: 'CS162', name: 'Operating Systems', tier: 2, util: 80, algs: ['virtual_memory','io','scheduling'] },
        { id: 'CS164', name: 'Programming Languages', tier: 3, util: 75, algs: ['type_systems','semantics'] },
        { id: 'EE120', name: 'Signals and Systems', tier: 2, util: 90, algs: ['convolution','filtering','laplace'] },
        { id: 'EE123', name: 'Digital Signal Processing', tier: 2, util: 90, algs: ['fir','iir','adaptive_filters'] },
        { id: 'ME131', name: 'Vehicle Dynamics', tier: 3, util: 75, algs: ['tire_models','suspension'] },
        { id: 'ME104', name: 'Engineering Mechanics II', tier: 3, util: 80, algs: ['dynamics','vibrations'] },
        { id: 'CS285', name: 'Deep Reinforcement Learning', tier: 2, util: 90, algs: ['ppo','sac','model_based_rl'] }
    ],

    // ═══════════════════════════════════════════════════════════════════════════
    // HARVARD COURSES (12 COURSES)
    // ═══════════════════════════════════════════════════════════════════════════
    HARVARD: [
        { id: 'CS50x', name: 'Intro Computer Science', tier: 1, util: 90, algs: ['data_structures','algorithms','web'] },
        { id: 'CS50AI', name: 'AI with Python', tier: 1, util: 95, algs: ['search','knowledge','uncertainty','optimization','learning'] },
        { id: 'CS153', name: 'Compilers', tier: 2, util: 80, algs: ['ir','register_allocation','llvm'] },
        { id: 'AP282', name: 'Computational Materials', tier: 2, util: 85, algs: ['molecular_dynamics','dft'] },
        { id: 'CS224', name: 'Advanced Algorithms', tier: 2, util: 80, algs: ['streaming','sketching','randomized'] },
        { id: 'STAT110', name: 'Intro Probability', tier: 2, util: 90, algs: ['bayes','markov_chains','distributions'] },
        { id: 'AM207', name: 'Stochastic Methods', tier: 3, util: 85, algs: ['mcmc','gibbs_sampling','hmc'] },
        { id: 'CS109', name: 'Data Science', tier: 2, util: 90, algs: ['pandas','sklearn','visualization'] },
        { id: 'ES250', name: 'Information Theory', tier: 3, util: 75, algs: ['entropy','compression','channels'] },
        { id: 'CS181', name: 'Machine Learning', tier: 2, util: 90, algs: ['ensemble','boosting','bagging'] },
        { id: 'ES201', name: 'Decision Theory', tier: 3, util: 80, algs: ['utility_theory','game_theory'] },
        { id: 'CS191', name: 'Quantum Computing', tier: 4, util: 60, algs: ['quantum_gates','shor','grover'] }
    ],

    // ═══════════════════════════════════════════════════════════════════════════
    // GEORGIA TECH COURSES (12 COURSES)
    // ═══════════════════════════════════════════════════════════════════════════
    GEORGIA_TECH: [
        { id: 'CNC_Pathways', name: 'Complete CNC Program', tier: 1, util: 95, algs: ['cnc_programming','gcode_syntax','setup'] },
        { id: 'ME4210', name: 'Manufacturing Processes', tier: 2, util: 90, algs: ['process_planning','shop_floor','scheduling'] },
        { id: 'ME4055', name: 'Biomedical Systems', tier: 3, util: 70, algs: ['precision_assembly'] },
        { id: 'CS6390', name: 'Programming Languages', tier: 3, util: 75, algs: ['language_design','semantics'] },
        { id: 'GaMEP', name: 'Manufacturing Extension', tier: 2, util: 85, algs: ['lean_manufacturing','six_sigma'] },
        { id: 'CS7641', name: 'Machine Learning', tier: 2, util: 90, algs: ['supervised','unsupervised','rl'] },
        { id: 'CS6601', name: 'Artificial Intelligence', tier: 2, util: 90, algs: ['game_playing','planning','logic'] },
        { id: 'ME6104', name: 'Fundamentals Robotics', tier: 2, util: 85, algs: ['robot_dynamics','trajectory'] },
        { id: 'ISYE6414', name: 'Statistical Modeling', tier: 2, util: 85, algs: ['regression','anova','doe'] },
        { id: 'ISYE6501', name: 'Analytics Modeling', tier: 2, util: 85, algs: ['classification','clustering_advanced'] },
        { id: 'ME4182', name: 'Machine Design', tier: 2, util: 85, algs: ['gear_design','shaft_design','bearing'] },
        { id: 'ME6201', name: 'Solid Mechanics', tier: 3, util: 80, algs: ['plasticity','viscoelasticity'] }
    ],

    // ═══════════════════════════════════════════════════════════════════════════
    // CALTECH COURSES (8 COURSES)
    // ═══════════════════════════════════════════════════════════════════════════
    CALTECH: [
        { id: 'ME115', name: 'Kinematics and Robotics', tier: 1, util: 95, algs: ['serial_robots','parallel_robots','workspace'] },
        { id: 'ME72', name: 'Engineering Design Lab', tier: 2, util: 80, algs: ['rapid_prototyping','design_iteration'] },
        { id: 'MS115', name: 'Dynamics of Materials', tier: 2, util: 85, algs: ['impact_dynamics','wave_propagation'] },
        { id: 'CMS139', name: 'Analysis Design Algorithms', tier: 2, util: 85, algs: ['complexity_analysis','np'] },
        { id: 'ME18', name: 'Engineering Thermodynamics', tier: 3, util: 80, algs: ['thermodynamic_cycles','efficiency'] },
        { id: 'CS156', name: 'Learning from Data', tier: 2, util: 90, algs: ['vc_theory','regularization','bias_variance'] },
        { id: 'ACM104', name: 'Applied Linear Algebra', tier: 2, util: 90, algs: ['matrix_decomposition','least_squares'] },
        { id: 'ACM106', name: 'Intro Computational Methods', tier: 2, util: 85, algs: ['root_finding','interpolation','quadrature'] }
    ],

    // ═══════════════════════════════════════════════════════════════════════════
    // PRINCETON COURSES (8 COURSES)
    // ═══════════════════════════════════════════════════════════════════════════
    PRINCETON: [
        { id: 'COS226', name: 'Algorithms Data Structures', tier: 1, util: 95, algs: ['union_find','priority_queue','graph_algorithms'] },
        { id: 'COS423', name: 'Theory of Algorithms', tier: 2, util: 85, algs: ['randomized','amortized','lower_bounds'] },
        { id: 'COS324', name: 'Intro Machine Learning', tier: 2, util: 90, algs: ['perceptron','backprop','generalization'] },
        { id: 'COS402', name: 'Machine Learning', tier: 2, util: 85, algs: ['em_algorithm','hmm_training','pgm'] },
        { id: 'ORF522', name: 'Linear Nonlinear Opt', tier: 2, util: 90, algs: ['trust_region','sequential_qp','barrier'] },
        { id: 'MAE345', name: 'Robotics', tier: 2, util: 85, algs: ['motion_planning','slam','localization'] },
        { id: 'COS598D', name: 'Advanced Optimization', tier: 3, util: 80, algs: ['stochastic_optimization','online'] },
        { id: 'MAE546', name: 'Optimal Control', tier: 3, util: 85, algs: ['dynamic_programming','lqg','mpc'] }
    ],

    // ═══════════════════════════════════════════════════════════════════════════
    // CORNELL COURSES (8 COURSES)
    // ═══════════════════════════════════════════════════════════════════════════
    CORNELL: [
        { id: 'CS4780', name: 'Machine Learning', tier: 2, util: 90, algs: ['kernels','gaussian_processes','deep'] },
        { id: 'CS5780', name: 'Advanced Machine Learning', tier: 2, util: 85, algs: ['deep_generative','vae','gan'] },
        { id: 'MAE5730', name: 'Intermediate Dynamics', tier: 3, util: 80, algs: ['lagrangian_mechanics','hamilton'] },
        { id: 'ORIE5270', name: 'Big Data Technologies', tier: 2, util: 80, algs: ['spark','distributed_ml'] },
        { id: 'CS6780', name: 'Advanced Machine Learning', tier: 3, util: 80, algs: ['meta_learning','few_shot'] },
        { id: 'MAE4730', name: 'Intermediate Dynamics', tier: 3, util: 75, algs: ['rigid_body_dynamics'] },
        { id: 'ORIE4741', name: 'Learning Messy Data', tier: 2, util: 85, algs: ['data_cleaning','feature_engineering'] },
        { id: 'CS5787', name: 'Deep Learning', tier: 2, util: 90, algs: ['attention_mechanisms','gan','vae'] }
    ],

    // ═══════════════════════════════════════════════════════════════════════════
    // DUKE COURSES (6 COURSES)
    // ═══════════════════════════════════════════════════════════════════════════
    DUKE: [
        { id: 'ECE550', name: 'Fundamentals Computer Systems', tier: 2, util: 80, algs: ['assembly','pipelining'] },
        { id: 'ECE553', name: 'Compiler Construction', tier: 2, util: 80, algs: ['backend_opt','code_generation'] },
        { id: 'DECISION611', name: 'Decision Models', tier: 2, util: 85, algs: ['decision_analysis','sensitivity'] },
        { id: 'ECE586', name: 'Vector Space Methods', tier: 3, util: 75, algs: ['hilbert_spaces','functional_analysis'] },
        { id: 'STA521', name: 'Predictive Modeling', tier: 2, util: 90, algs: ['random_forest','xgboost','lightgbm'] },
        { id: 'ME555', name: 'Parallel Computing', tier: 3, util: 75, algs: ['domain_decomposition','mpi'] }
    ],

    // ═══════════════════════════════════════════════════════════════════════════
    // OTHER UNIVERSITIES (13 COURSES)
    // ═══════════════════════════════════════════════════════════════════════════
    OTHER: [
        { id: 'VAND_ME344', name: 'Advanced Manufacturing', univ: 'Vanderbilt', tier: 2, util: 80, algs: ['additive_mfg','micro_machining'] },
        { id: 'UCD_EMS103', name: 'Materials Science', univ: 'UC Davis', tier: 2, util: 85, algs: ['structure_property'] },
        { id: 'UCLA_MAT121', name: 'Materials Processing', univ: 'UCLA', tier: 3, util: 75, algs: ['characterization_methods'] },
        { id: 'UCSD_MAE155A', name: 'Aerospace Structures', univ: 'UCSD', tier: 3, util: 70, algs: ['composite_analysis'] },
        { id: 'YALE_CPSC365', name: 'Algorithms', univ: 'Yale', tier: 2, util: 85, algs: ['advanced_dp'] },
        { id: 'NW_ME495', name: 'Manufacturing Systems', univ: 'Northwestern', tier: 2, util: 80, algs: ['production_control'] },
        { id: 'MICH_ME401', name: 'Manufacturing Processes', univ: 'Michigan', tier: 2, util: 85, algs: ['metal_forming'] },
        { id: 'UIUC_ME470', name: 'Senior Design', univ: 'UIUC', tier: 3, util: 75, algs: ['design_process'] },
        { id: 'PURD_ME356', name: 'Manufacturing Processes', univ: 'Purdue', tier: 2, util: 85, algs: ['chip_formation'] },
        { id: 'UTA_ME379M', name: 'Robot Kinematics', univ: 'UT Austin', tier: 2, util: 80, algs: ['screw_theory'] },
        { id: 'WISC_ME349', name: 'Manufacturing Processes', univ: 'Wisconsin', tier: 2, util: 80, algs: ['cutting_tool_wear'] },
        { id: 'PSU_IE302', name: 'Manufacturing Systems', univ: 'Penn State', tier: 2, util: 80, algs: ['cellular_manufacturing'] },
        { id: 'OSU_ME5355', name: 'Advanced Manufacturing', univ: 'Ohio State', tier: 3, util: 75, algs: ['additive_process'] }
    ],

    // ═══════════════════════════════════════════════════════════════════════════
    // ONLINE PLATFORMS (20 COURSES)
    // ═══════════════════════════════════════════════════════════════════════════
    ONLINE: [
        { id: 'COURSERA_ML', name: 'ML Specialization', platform: 'Coursera', provider: 'Stanford', tier: 1, util: 95, algs: ['complete_ml_pipeline'] },
        { id: 'COURSERA_DL', name: 'Deep Learning Spec', platform: 'Coursera', provider: 'deeplearning.ai', tier: 1, util: 95, algs: ['cnn','rnn','seq2seq'] },
        { id: 'COURSERA_ROBOT', name: 'Robotics Spec', platform: 'Coursera', provider: 'Penn', tier: 2, util: 85, algs: ['aerial_robotics','motion_planning'] },
        { id: 'COURSERA_MFG', name: 'Manufacturing Analytics', platform: 'Coursera', provider: 'Buffalo', tier: 2, util: 80, algs: ['manufacturing_analytics'] },
        { id: 'COURSERA_MAT', name: 'Materials Science', platform: 'Coursera', provider: 'UC Davis', tier: 2, util: 85, algs: ['materials_characterization'] },
        { id: 'COURSERA_SC', name: 'Supply Chain Mgmt', platform: 'Coursera', provider: 'Rutgers', tier: 2, util: 80, algs: ['inventory_optimization'] },
        { id: 'COURSERA_DS', name: 'Data Science Spec', platform: 'Coursera', provider: 'JHU', tier: 2, util: 85, algs: ['statistical_inference'] },
        { id: 'COURSERA_TF', name: 'TensorFlow Developer', platform: 'Coursera', provider: 'deeplearning.ai', tier: 2, util: 90, algs: ['tf_models'] },
        { id: 'EDX_ML', name: 'ML with Python', platform: 'edX', provider: 'MIT', tier: 2, util: 85, algs: ['sklearn_ml'] },
        { id: 'EDX_SC', name: 'Supply Chain Analytics', platform: 'edX', provider: 'MIT', tier: 2, util: 80, algs: ['supply_chain_optimization'] },
        { id: 'EDX_STAT', name: 'Statistical Learning', platform: 'edX', provider: 'Stanford', tier: 2, util: 90, algs: ['regularization','cross_validation'] },
        { id: 'EDX_CVX', name: 'Convex Optimization', platform: 'edX', provider: 'Stanford', tier: 2, util: 90, algs: ['cvx_solvers'] },
        { id: 'UDACITY_SDC', name: 'Self-Driving Car', platform: 'Udacity', tier: 2, util: 80, algs: ['sensor_fusion','path_planning'] },
        { id: 'UDACITY_ROBOT', name: 'Robotics Software Eng', platform: 'Udacity', tier: 2, util: 80, algs: ['ros','slam'] },
        { id: 'UDACITY_AI', name: 'AI Programming', platform: 'Udacity', tier: 2, util: 85, algs: ['pytorch_models'] },
        { id: 'FASTAI_DL', name: 'Practical Deep Learning', platform: 'fast.ai', tier: 1, util: 95, algs: ['transfer_learning','fine_tuning'] },
        { id: 'FASTAI_ML', name: 'Intro Machine Learning', platform: 'fast.ai', tier: 2, util: 85, algs: ['random_forests','gradient_boosting'] },
        { id: '3B1B_NN', name: 'Neural Networks', platform: 'YouTube', provider: '3Blue1Brown', tier: 2, util: 85, algs: ['nn_visualization'] },
        { id: 'STATQUEST', name: 'Statistics Fundamentals', platform: 'YouTube', provider: 'StatQuest', tier: 2, util: 85, algs: ['statistics_basics'] },
        { id: 'SENTDEX', name: 'Python ML Tutorials', platform: 'YouTube', provider: 'Sentdex', tier: 3, util: 75, algs: ['practical_ml'] }
    ]
}