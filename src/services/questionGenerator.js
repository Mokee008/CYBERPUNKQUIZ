import { shuffleArray } from '../utils/shuffle.js';

/**
 * Question Generator Engine
 * Generates dynamic, high-quality quiz questions across:
 * 1. CA (Chartered Accountancy & Finance)
 * 2. Healthcare (Clinical, Pharmacology, Anatomy, Public Health)
 * 3. Programming (Data Structures, Architecture, Languages, Algorithms)
 * 4. Agriculture (Soil Science, Agronomy, Irrigation, Crop Protection)
 * 5. Biology (Genetics, Cell Biology, Physiology, Ecology)
 *
 * Supports optional external OpenTDB API fetching with instant procedural fallback.
 */

const SECTOR_TOPICS = {
  CA: [
    {
      q: 'Under standard auditing principles (SA 315), what constitutes "Audit Risk"?',
      opts: [
        'The risk that the auditor expresses an inappropriate audit opinion when financial statements are materially misstated',
        'The risk that the client company becomes insolvent within twelve months of the audit date',
        'The risk of legal penalties imposed on the board of directors for tax non-compliance',
        'The probability of variance between budgeted sales and actual cash receipts'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'Audit Risk is mathematically defined as the function of Risk of Material Misstatement and Detection Risk.'
    },
    {
      q: 'In marginal costing and break-even analysis, what is the Contribution Margin equal to?',
      opts: [
        'Sales Revenue minus Total Variable Costs',
        'Net Profit minus Total Depreciation',
        'Gross Profit minus Fixed Overheads',
        'Operating Cash Flow minus Capital Expenditure'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'Contribution Margin is calculated as Sales minus Variable Costs, representing funds available to cover fixed costs.'
    },
    {
      q: 'Under International Financial Reporting Standards (IFRS 15), when is revenue from contracts recognized?',
      opts: [
        'When control of the promised goods or services is transferred to the customer',
        'Immediately upon signing the bilateral sales agreement',
        'Only after 100% of the cash consideration is settled in the bank account',
        'At the end of the standard financial quarter regardless of delivery'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'IFRS 15 establishes a 5-step model where revenue is recognized upon transferring control of promised goods or services.'
    },
    {
      q: 'What is the purpose of testing "Substantive Analytical Procedures" during an independent audit?',
      opts: [
        'To identify inconsistencies or unexpected relationships between financial and non-financial data',
        'To verify physical existence of all inventory warehouses via drone imaging',
        'To assess psychological stress levels among senior accounting managers',
        'To ensure statutory compliance with local environmental zoning laws'
      ],
      correct: 0,
      diff: 'hard',
      exp: 'Substantive analytical procedures evaluate financial information through analysis of plausible relationships among data.'
    },
    {
      q: 'In corporate taxation, what distinguishes a Capital Expenditure from a Revenue Expenditure?',
      opts: [
        'Capital expenditure yields enduring economic benefits over multiple accounting periods',
        'Capital expenditure is always fully deductible in the single year incurred',
        'Revenue expenditure relates exclusively to the purchase of immovable property',
        'Revenue expenditure can only be funded through equity issuance'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'Capital expenditures generate enduring economic benefits and are capitalized on the balance sheet, while revenue expenses are expensed in the current period.'
    },
    {
      q: 'Which financial ratio indicates a company\'s ability to settle short-term obligations without liquidating inventory?',
      opts: [
        'Quick Ratio (Acid-Test Ratio)',
        'Debt-to-Equity Ratio',
        'Return on Capital Employed (ROCE)',
        'Inventory Turnover Ratio'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'The Quick Ratio excludes inventory from current assets because inventory takes longer to liquidate into immediate cash.'
    },
    {
      q: 'Under standard Corporate Governance requirements, what is the primary role of an Audit Committee?',
      opts: [
        'Oversight of financial reporting processes, internal controls, and auditor independence',
        'Direct execution of daily accounts payable payments and vendor reconciliations',
        'Setting market retail prices for consumer product launches',
        'Approving commercial marketing campaigns and social media presence'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'The Audit Committee is a board committee focused on financial integrity, regulatory compliance, and risk oversight.'
    },
    {
      q: 'In activity-based costing (ABC), what is a "Cost Driver"?',
      opts: [
        'A factor that causes or triggers an increase in the cost of an activity',
        'The chief financial officer responsible for approving payroll budgets',
        'A software tool used for algorithmic stock trading',
        'The profit markup percentage applied to manufactured goods'
      ],
      correct: 0,
      diff: 'hard',
      exp: 'A cost driver is the causal factor (e.g., machine hours, batch runs) that drives the resource consumption in an activity.'
    },
    {
      q: 'What is the consequence of applying the "Prudence / Conservatism Principle" in financial reporting?',
      opts: [
        'Anticipating potential losses immediately while recognizing profits only when realized',
        'Overstating asset values to enhance shareholder borrowing power',
        'Deferring all operating liabilities until legal judgments are finalized',
        'Writing off all long-term assets immediately upon purchase'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'The Prudence principle dictates that prospective losses must be recognized when probable, whereas revenues require realized certainty.'
    },
    {
      q: 'Under modern Transfer Pricing regulations, what is the "Arm\'s Length Principle"?',
      opts: [
        'Transactions between related entities must be priced as if between unrelated independent parties',
        'Directors must stand at least one meter apart during board resolutions',
        'All international wire transfers must be settled through government escrow banks',
        'Tax deductions are prohibited on foreign currency denominated loans'
      ],
      correct: 0,
      diff: 'hard',
      exp: 'The Arm\'s length principle prevents multinational tax avoidance by demanding market-rate pricing for intra-group transactions.'
    }
  ],
  Healthcare: [
    {
      q: 'What is considered the normal resting systolic blood pressure range in a healthy adult?',
      opts: [
        '90 to 120 mm Hg',
        '140 to 180 mm Hg',
        '50 to 70 mm Hg',
        '190 to 220 mm Hg'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'Normal resting adult systolic pressure is typically between 90 and 120 mm Hg, with diastolic below 80 mm Hg.'
    },
    {
      q: 'Which functional unit of the human kidney is responsible for filtering blood and urine formation?',
      opts: [
        'Nephron',
        'Alveolus',
        'Hepatocyte',
        'Chondrocyte'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'Each human kidney contains roughly one million nephrons which filter blood through the glomerulus and tubules.'
    },
    {
      q: 'What is the primary pharmacodynamic mechanism of action of Beta-blocker medications?',
      opts: [
        'Antagonizing beta-adrenergic receptors to reduce heart rate and myocardial contractility',
        'Inhibiting bacterial cell wall synthesis through peptidoglycan transpeptidation',
        'Stimulating dopamine release in the central basal ganglia',
        'Blocking histamine H1 receptors in bronchial smooth muscles'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'Beta-blockers bind competitively to beta-1 adrenergic receptors, blunting epinephrine effects to lower heart rate and blood pressure.'
    },
    {
      q: 'Which blood biomarker is considered the clinical gold standard for diagnosing acute myocardial infarction (heart attack)?',
      opts: [
        'Cardiac Troponin (cTnI / cTnT)',
        'Serum Bilirubin',
        'Blood Urea Nitrogen (BUN)',
        'Alkaline Phosphatase (ALP)'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'Troponins are specific structural proteins released into the bloodstream upon myocardial muscle necrosis.'
    },
    {
      q: 'What distinguishes Type 1 Diabetes Mellitus from Type 2 Diabetes Mellitus pathophysiologically?',
      opts: [
        'Type 1 is autoimmune destruction of pancreatic beta cells, whereas Type 2 involves peripheral insulin resistance',
        'Type 1 is caused solely by excess dietary carbohydrate intake in adulthood',
        'Type 2 results from congenital absence of the gallbladder',
        'Type 1 exclusively damages skeletal muscle fibers without affecting insulin'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'Type 1 is an autoimmune deficiency of endogenous insulin production, while Type 2 is progressive insulin resistance.'
    },
    {
      q: 'In emergency triage systems (e.g., START protocol), what does a "Red" tag indicate?',
      opts: [
        'Immediate life-threatening injury requiring rapid medical intervention',
        'Minor walking wounded patient requiring minimal immediate care',
        'Deceased or non-salvageable patient with absence of spontaneous respiration',
        'Delayed treatment allowable for stable fractures'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'Red denotes immediate priority for patients with airway compromise, severe hemorrhage, or decompensated shock.'
    },
    {
      q: 'Which immunoglobulin class is the primary antibody involved in Type I hypersensitivity allergic reactions?',
      opts: [
        'Immunoglobulin E (IgE)',
        'Immunoglobulin G (IgG)',
        'Immunoglobulin M (IgM)',
        'Immunoglobulin A (IgA)'
      ],
      correct: 0,
      diff: 'hard',
      exp: 'IgE binds to Fc receptors on mast cells and basophils, triggering degranulation and histamine release upon allergen cross-linking.'
    },
    {
      q: 'What is the primary role of surfactant secreted by Type II alveolar cells in the lungs?',
      opts: [
        'To reduce alveolar surface tension and prevent end-expiratory lung collapse',
        'To enzymatically digest inhaled airborne particulate contaminants',
        'To transport oxygen across the capillary endothelial membrane into red cells',
        'To regulate systemic core body temperature via evaporative cooling'
      ],
      correct: 0,
      diff: 'hard',
      exp: 'Pulmonary surfactant lowers surface tension, increasing lung compliance and preventing atelectasis during exhalation.'
    },
    {
      q: 'Which pathogen is the causative agent of Tuberculosis?',
      opts: [
        'Mycobacterium tuberculosis',
        'Streptococcus pneumoniae',
        'Staphylococcus aureus',
        'Haemophilus influenzae'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'Mycobacterium tuberculosis is an acid-fast bacillus responsible for pulmonary and extrapulmonary tuberculosis.'
    },
    {
      q: 'What clinical sign is characterized by a rapid, thread-like pulse and severe systemic hypotension due to organ hypoperfusion?',
      opts: [
        'Circulatory Shock',
        'Hypertensive Crisis',
        'Acute Bronchospasm',
        'Peripheral Edema'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'Circulatory shock is a life-threatening state of cellular hypoxia secondary to impaired systemic blood perfusion.'
    }
  ],
  Programming: [
    {
      q: 'What is the average time complexity of searching an element in a balanced Binary Search Tree (BST)?',
      opts: [
        'O(log n)',
        'O(n)',
        'O(1)',
        'O(n²)'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'In a balanced BST, each comparison halves the remaining search space, yielding O(log n) time complexity.'
    },
    {
      q: 'In modern JavaScript, which task queue executes microtasks before the next macrotask (such as setTimeout)?',
      opts: [
        'The Promise job queue (Microtask Queue)',
        'The Web Audio rendering queue',
        'The GPU hardware acceleration queue',
        'The File System I/O cache'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'The event loop clears all pending microtasks (Promise reactions, queueMicrotask) before picking the next task.'
    },
    {
      q: 'What design principle does the "D" in SOLID software design represent?',
      opts: [
        'Dependency Inversion Principle',
        'Data Isolation Principle',
        'Dynamic Inheritance Paradigm',
        'Deterministic Interface Pattern'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'The Dependency Inversion Principle states that high-level modules should depend on abstractions rather than concrete details.'
    },
    {
      q: 'Which data structure is primarily used by web browsers to store history navigation for back and forward actions?',
      opts: [
        'Two Stacks (LIFO)',
        'A single Circular Queue (FIFO)',
        'A B-Tree index',
        'A Disjoint Set Union (DSU)'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'Browser back/forward history is classically implemented with two stacks: one for previous pages and one for forward pages.'
    },
    {
      q: 'What is a "Race Condition" in concurrent multi-threaded programming?',
      opts: [
        'A bug where program correctness depends on the uncontrollable execution timing of concurrent threads',
        'A compiler optimization that speeds up mathematical loops',
        'A hardware failure where CPU clock speed exceeds motherboard limits',
        'A database migration that finishes ahead of scheduled deployment'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'A race condition occurs when multiple threads access shared state without proper synchronization, causing non-deterministic outcomes.'
    },
    {
      q: 'Which SQL clause is used to filter aggregated group records, in contrast to WHERE which filters individual rows?',
      opts: [
        'HAVING',
        'GROUP FILTER',
        'OVER',
        'PARTITION BY'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'The HAVING clause filters groups created by GROUP BY based on aggregate functions like COUNT() or SUM().'
    },
    {
      q: 'What does "Idempotency" mean in the context of RESTful HTTP API design?',
      opts: [
        'Making multiple identical requests produces the exact same server state as a single request',
        'The endpoint returns response payloads encrypted with symmetric AES keys',
        'The API is accessible only over local internal network interfaces',
        'The server executes asynchronous tasks in background worker pools'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'GET, PUT, and DELETE are idempotent HTTP methods: executing them multiple times results in the same side effects.'
    },
    {
      q: 'In algorithm design, what key characteristic differentiates Dynamic Programming from Divide and Conquer?',
      opts: [
        'Dynamic Programming caches results of overlapping subproblems to prevent redundant computation',
        'Dynamic Programming never uses recursion under any circumstances',
        'Divide and Conquer operates exclusively on sorted integer arrays',
        'Divide and Conquer stores subproblem solutions in disk databases'
      ],
      correct: 0,
      diff: 'hard',
      exp: 'Dynamic Programming solves problems with overlapping subproblems and optimal substructure by memoizing subproblem solutions.'
    },
    {
      q: 'Which data structure underlies most production database indexing (such as MySQL InnoDB or PostgreSQL B-tree)?',
      opts: [
        'B+ Tree',
        'Linked List',
        'Binary Heap',
        'Trie'
      ],
      correct: 0,
      diff: 'hard',
      exp: 'B+ Trees keep all records in leaf nodes with sequential pointers, minimizing disk I/O operations for range scans.'
    },
    {
      q: 'What vulnerability occurs when an application executes untrusted dynamic user input directly inside database queries?',
      opts: [
        'SQL Injection (SQLi)',
        'Cross-Site Request Forgery (CSRF)',
        'Server-Side Request Forgery (SSRF)',
        'Buffer Overflow'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'SQL Injection happens when untrusted user inputs alter the intended syntax of SQL statements due to missing parameterization.'
    }
  ],
  Agriculture: [
    {
      q: 'What do the three primary numbers on commercial fertilizer labels (NPK ratio) represent?',
      opts: [
        'Nitrogen, Phosphorus, and Potassium',
        'Nickel, Platinum, and Krypton',
        'Nitrate, Phosphate, and Kalium sulfate',
        'Nitrogen, Peat moss, and Kinetic minerals'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'N-P-K represents the percentage content of Nitrogen (leaf growth), Phosphorus (roots/flowers), and Potassium (overall vigor).'
    },
    {
      q: 'Which irrigation technique delivers water directly to plant root zones, achieving up to 90% water efficiency?',
      opts: [
        'Drip (Micro) Irrigation',
        'Flood (Surface) Irrigation',
        'Wild Flooding',
        'Overhead Cannon Sprinkler'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'Drip irrigation minimizes evaporation and runoff by applying controlled water droplets directly near root systems.'
    },
    {
      q: 'What is the primary agricultural benefit of planting leguminous cover crops (such as clover or pulses) in crop rotation?',
      opts: [
        'Biological fixation of atmospheric nitrogen into plant-available soil forms',
        'Total eradication of all fungal spores in the soil microbiome',
        'Acidifying alkaline soils down to a pH of 3.0',
        'Eliminating the need for solar radiation during germination'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'Legumes form symbiotic relationships with Rhizobium bacteria, fixing inert atmospheric nitrogen into bioavailable ammonium.'
    },
    {
      q: 'What soil property measures the relative acidity or alkalinity, with an optimal range of 6.0 to 7.0 for most crops?',
      opts: [
        'Soil pH',
        'Cation Exchange Capacity (CEC)',
        'Soil Bulk Density',
        'Electrical Conductivity (EC)'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'Soil pH dictates nutrient availability; a slightly acidic to neutral pH (6.0 - 7.0) maximizes uptake of essential macro- and micro-nutrients.'
    },
    {
      q: 'In sustainable agriculture, what is Integrated Pest Management (IPM)?',
      opts: [
        'A multi-faceted strategy combining biological control, habitat manipulation, and targeted chemical use',
        'Routine calendar-based aerial spraying of synthetic organophosphates',
        'Total elimination of all insect species within a five-mile farm radius',
        'Replacing all crop varieties with laboratory-grown synthetic foliage'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'IPM focuses on long-term pest prevention by prioritizing biological, cultural, and mechanical controls over prophylactic chemical sprays.'
    },
    {
      q: 'What agricultural phenomenon occurs when excessive chemical fertilizers wash into rivers and lakes, triggering massive algae blooms?',
      opts: [
        'Eutrophication',
        'Salinization',
        'Soil Desertification',
        'Biomagnification'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'Eutrophication is nutrient enrichment of water bodies leading to algal blooms, light deprivation, and aquatic hypoxia.'
    },
    {
      q: 'Which soil horizon layer contains the highest concentration of organic matter and microbial activity (humus)?',
      opts: [
        'O Horizon / A Horizon (Topsoil)',
        'B Horizon (Subsoil)',
        'C Horizon (Parent Rock)',
        'R Horizon (Bedrock)'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'The O and A horizons form the fertile topsoil enriched with decomposing organic humus and active biological soil life.'
    },
    {
      q: 'What is "Conservation Tillage" or "No-Till" farming designed to achieve?',
      opts: [
        'Preserving soil structure, enhancing water retention, and minimizing wind and water erosion',
        'Exposing buried weed seeds to sunlight to accelerate germination',
        'Aerating the entire top 24 inches of soil with heavy machinery before planting',
        'Sterilizing beneficial soil fungi using heat dissipation'
      ],
      correct: 0,
      diff: 'hard',
      exp: 'No-till minimizes soil disturbance, keeping crop residue on the surface to shield against erosion and foster soil carbon sequestration.'
    },
    {
      q: 'Which agricultural season in South Asia is sown in autumn (October-November) and harvested in spring (March-April)?',
      opts: [
        'Rabi Season (e.g., Wheat, Mustard, Gram)',
        'Kharif Season (e.g., Rice, Maize, Cotton)',
        'Zaid Season (e.g., Watermelon, Cucumber)',
        'Monsoon Flood Season'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'Rabi crops are winter agricultural crops sown after monsoon rains recede and harvested before summer heat peaks.'
    },
    {
      q: 'What is "Hydroponics" in controlled-environment agriculture?',
      opts: [
        'Cultivating plants in nutrient-rich water solutions without using soil',
        'Growing crops submerged on ocean seafloors using tidal currents',
        'Farming solely during periods of natural rainfall',
        'Using underground lava tubes for geothermal greenhouse heating'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'Hydroponics bypasses soil by delivering balanced mineral nutrient solutions directly to plant roots in controlled inert media.'
    }
  ],
  Biology: [
    {
      q: 'Which cellular organelle is responsible for synthesizing ATP through aerobic cellular respiration ("the powerhouse of the cell")?',
      opts: [
        'Mitochondria',
        'Golgi Apparatus',
        'Ribosome',
        'Lysosome'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'Mitochondria generate the majority of cellular adenosine triphosphate (ATP) via the Krebs cycle and oxidative phosphorylation.'
    },
    {
      q: 'In molecular genetics, what enzyme is responsible for unwinding the DNA double helix during replication?',
      opts: [
        'DNA Helicase',
        'DNA Ligase',
        'RNA Polymerase',
        'Amylase'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'DNA Helicase breaks the hydrogen bonds between complementary base pairs to open replication forks.'
    },
    {
      q: 'What is the primary role of Ribosomes within the biological cell?',
      opts: [
        'Protein synthesis via translation of messenger RNA (mRNA)',
        'Lipid bilayer digestion through hydrolytic enzymes',
        'Replication of cellular chromatin during mitotic anaphase',
        'Photosynthetic light energy conversion into glucose'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'Ribosomes assemble polypeptide chains by reading mRNA codon sequences and linking corresponding amino acids.'
    },
    {
      q: 'What type of genetic inheritance occurs when both alleles are fully and simultaneously expressed in a heterozygote (e.g., AB blood type)?',
      opts: [
        'Codominance',
        'Incomplete Dominance',
        'Sex-Linked Recessive',
        'Polygenic Epistasis'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'Codominance results in the distinct, simultaneous phenotypic expression of both parental alleles without blending.'
    },
    {
      q: 'In plant physiology, what green pigment inside thylakoid membranes absorbs photons for photosynthesis?',
      opts: [
        'Chlorophyll',
        'Carotenoid',
        'Hemoglobin',
        'Anthocyanin'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'Chlorophyll molecules absorb red and blue wavelengths of visible light to energize electrons during photosystems I and II.'
    },
    {
      q: 'What is the biological term for the maintenance of a stable internal physiological state despite external environmental changes?',
      opts: [
        'Homeostasis',
        'Hemostasis',
        'Anabolism',
        'Chemotaxis'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'Homeostasis encompasses regulatory feedback mechanisms (e.g., thermoregulation, blood glucose) maintaining physiological equilibrium.'
    },
    {
      q: 'Which phase of cell division (Mitosis) is characterized by sister chromatids separating and moving toward opposite poles?',
      opts: [
        'Anaphase',
        'Metaphase',
        'Prophase',
        'Telophase'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'During anaphase, spindle fibers pull sister chromatids apart toward opposite centrosome poles of the dividing cell.'
    },
    {
      q: 'What macromolecular structure caps the ends of eukaryotic chromosomes, protecting them from degradation during successive cell divisions?',
      opts: [
        'Telomeres',
        'Centromeres',
        'Kinetochores',
        'Histones'
      ],
      correct: 0,
      diff: 'hard',
      exp: 'Telomeres are repetitive nucleotide sequences at chromosome ends that shorten with repeated rounds of cellular replication.'
    },
    {
      q: 'Which trophic level directly follows primary producers (photosynthetic autotrophs) in an ecological food chain?',
      opts: [
        'Primary Consumers (Herbivores)',
        'Secondary Consumers (Carnivores)',
        'Tertiary Consumers (Apex Predators)',
        'Decomposers (Saprotrophs)'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'Primary consumers feed directly on primary producers to obtain energy and organic nutrients.'
    },
    {
      q: 'What molecule acts as the primary neurotransmitter across the neuromuscular junction to stimulate skeletal muscle contraction?',
      opts: [
        'Acetylcholine (ACh)',
        'Dopamine',
        'Serotonin',
        'Glutamate'
      ],
      correct: 0,
      diff: 'hard',
      exp: 'Acetylcholine is released from motor neuron terminals and binds nicotinic receptors on the muscle motor end plate, triggering depolarization.'
    }
  ]
};

// Procedural question template variations to generate endless fresh questions per sector
const PROCEDURAL_GENERATORS = {
  CA: [
    (n) => ({
      q: `Under auditing standard SA ${200 + (n % 600)}, what is the primary duty of an external auditor when assessing internal control deficiencies of class Level-${(n % 4) + 1}?`,
      opts: [
        'Evaluate the magnitude of potential misstatement and communicate significant deficiencies in writing to governance',
        'Directly alter the general ledger journal entries to compensate for the control deficiency',
        'Resign immediately without submitting an audit memorandum to the regulators',
        'Double the audited entity\'s tax liability for the upcoming assessment cycle'
      ],
      correct: 0,
      diff: (n % 3 === 0) ? 'easy' : (n % 3 === 1) ? 'medium' : 'hard',
      exp: 'Auditing standards require auditors to evaluate deficiencies and report significant matters to Those Charged With Governance (TCWG).'
    }),
    (n) => ({
      q: `When calculating Depreciation on capital equipment valued at $${(n * 50000 + 100000).toLocaleString()} under the Written Down Value (WDV) method at ${(n % 15) + 10}%, what is the principal accounting characteristic?`,
      opts: [
        'Depreciation expense progressively decreases each successive year as the asset carrying value declines',
        'Depreciation expense remains strictly identical every year until salvage value is reached',
        'The asset value is written down to zero in the second operating quarter regardless of lifespan',
        'No depreciation is recognized until the asset is completely liquidated'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'The WDV (diminishing balance) method applies a fixed percentage to the reducing net book value each financial year.'
    }),
    (n) => ({
      q: `Under corporate taxation Section ${(n % 60) + 140}, what consequence applies when an enterprise delays advance tax installment #${(n % 4) + 1}?`,
      opts: [
        'Mandatory interest is levied under Section 234C on the shortfall of returned income',
        'The company\'s operating commercial license is revoked immediately without notice',
        'All international supplier contracts are deemed null and void by the revenue authorities',
        'The board of directors is prohibited from approving quarterly dividends for five years'
      ],
      correct: 0,
      diff: 'hard',
      exp: 'Interest under Section 234C is charged for deferment of advance tax installments according to statutory percentage cutoffs.'
    }),
    (n) => ({
      q: `In management accounting, if a company incurs Fixed Costs of $${(n * 10000 + 40000).toLocaleString()} and achieves a P/V ratio of ${(n % 20) + 25}%, what is its Break-Even Sales value?`,
      opts: [
        `$${Math.round((n * 10000 + 40000) / (((n % 20) + 25) / 100)).toLocaleString()}`,
        `$${Math.round((n * 10000 + 40000) * 0.5).toLocaleString()}`,
        `$${Math.round((n * 10000 + 40000) * 1.8).toLocaleString()}`,
        `$${Math.round((n * 10000 + 40000) * 0.25).toLocaleString()}`
      ],
      correct: 0,
      diff: 'medium',
      exp: 'Break-Even Point in sales value is calculated as Fixed Costs divided by the Profit-Volume (P/V) ratio.'
    })
  ],
  Healthcare: [
    (n) => ({
      q: `In clinical patient monitoring, a patient presents with an oxygen saturation (SpO2) of ${80 + (n % 8)}% on room air. What clinical intervention is immediately indicated?`,
      opts: [
        'Administer supplemental oxygen therapy and evaluate airway patency',
        'Prescribe oral sedatives to lower respiratory drive',
        'Discharge the patient with routine outpatient follow-up instructions',
        'Restrict fluid intake to 500ml per day without vital sign monitoring'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'An SpO2 below 90% constitutes clinical hypoxemia requiring immediate supplemental oxygen support and clinical assessment.'
    }),
    (n) => ({
      q: `What is the therapeutic classification of antibiotic compound #${(n % 20) + 1} that targets bacterial DNA gyrase and topoisomerase IV?`,
      opts: [
        'Fluoroquinolones (e.g., Ciprofloxacin, Levofloxacin)',
        'Beta-lactams (e.g., Amoxicillin, Penicillin)',
        'Macrolides (e.g., Azithromycin, Erythromycin)',
        'Aminoglycosides (e.g., Gentamicin, Tobramycin)'
      ],
      correct: 0,
      diff: 'hard',
      exp: 'Fluoroquinolones inhibit bacterial type II topoisomerases (DNA gyrase), blocking bacterial DNA replication and transcription.'
    }),
    (n) => ({
      q: `A patient exhibits an elevated arterial blood pressure reading of ${145 + (n % 30)}/${92 + (n % 15)} mm Hg on consecutive clinic visits. How is this classified under ACC/AHA guidelines?`,
      opts: [
        'Stage 2 Hypertension',
        'Normal Optimal Blood Pressure',
        'Isolated Orthostatic Hypotension',
        'Acute Neurogenic Shock'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'Systolic blood pressure >= 140 mm Hg or diastolic >= 90 mm Hg is classified as Stage 2 Hypertension under clinical guidelines.'
    }),
    (n) => ({
      q: `In pharmacokinetics, if a therapeutic agent has an elimination half-life of ${(n % 8) + 4} hours, approximately how long does it take to reach steady-state plasma concentration with constant dosing?`,
      opts: [
        `Approximately ${((n % 8) + 4) * 5} hours (4 to 5 half-lives)`,
        `Exactly ${(n % 8) + 4} hours (1 half-life)`,
        `Over 120 hours regardless of half-life`,
        `Under 30 minutes due to first-pass hepatic metabolism`
      ],
      correct: 0,
      diff: 'hard',
      exp: 'Drug steady state (where rate of drug administration equals rate of elimination) is achieved after approximately 4 to 5 elimination half-lives.'
    })
  ],
  Programming: [
    (n) => ({
      q: `In algorithm analysis, what is the worst-case time complexity of QuickSort when partitioned on an array of size N=${1000 * (n + 1)} with pathological pivot selection?`,
      opts: [
        'O(N²)',
        'O(N log N)',
        'O(N)',
        'O(log N)'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'With poor pivot selection (such as always picking the extreme element on an already sorted array), QuickSort degenerates to O(N²).'
    }),
    (n) => ({
      q: `In microservice software architecture, what pattern is implemented using a circuit breaker with threshold ${(n % 5) + 3} consecutive network failures?`,
      opts: [
        'Prevent cascading service failures by failing fast and returning fallback responses when downstream services degrade',
        'Increase HTTP request timeout duration infinitely until the downstream host recovers',
        'Automatically restart the entire operating system kernel on the host cluster',
        'Convert all JSON payloads into raw binary assembly bytecode'
      ],
      correct: 0,
      diff: 'hard',
      exp: 'Circuit breakers prevent cascading outages across distributed services by halting calls to failing upstream dependencies.'
    }),
    (n) => ({
      q: `In database systems, what is the primary structural reason a B+ Tree index with branching factor ${(n % 15) + 16} is preferred over a standard Binary Search Tree for disk storage?`,
      opts: [
        'Higher branching factor keeps the tree shallow, drastically reducing disk block I/O lookups',
        'B+ Trees store every key encrypted using 256-bit AES algorithms by default',
        'Binary Search Trees cannot store numerical integer values',
        'B+ Trees eliminate the need for transaction commit logs (WAL)'
      ],
      correct: 0,
      diff: 'hard',
      exp: 'B+ trees have a high fan-out (branching factor), keeping the tree height small (typically 3-4 levels) which minimizes slow disk reads.'
    }),
    (n) => ({
      q: `Which HTTP response status code is RFC-mandated when a REST API client submits a request that conflicts with the current server resource state (e.g., duplicate transaction #${n + 100})?`,
      opts: [
        '409 Conflict',
        '502 Bad Gateway',
        '400 Bad Request',
        '404 Not Found'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'HTTP 409 Conflict indicates that the request could not be completed due to a conflict with the current state of the target resource.'
    })
  ],
  Agriculture: [
    (n) => ({
      q: `In precision soil management, a test field exhibits a Cation Exchange Capacity (CEC) of ${(n % 25) + 10} meq/100g. What does this property indicate about the soil?`,
      opts: [
        'The soil\'s capacity to hold and exchange essential positively charged nutrient cations (Ca²⁺, Mg²⁺, K⁺)',
        'The speed at which tractor machinery can traverse the furrow without compacting subsoil',
        'The exact percentage of sand grains relative to organic mulch particles',
        'The depth of groundwater aquifers below sea level'
      ],
      correct: 0,
      diff: 'hard',
      exp: 'CEC measures soil fertility and its capacity to retain essential nutrient cations against leaching by rainfall or irrigation.'
    }),
    (n) => ({
      q: `When managing a crop field with drip irrigation at ${(n % 10) + 15} psi operating pressure, what primary factor prevents emitter nozzle clogging?`,
      opts: [
        'Adequate pre-filtration (disk or screen filters) and routine chemical line flushing',
        'Increasing water temperature to boiling levels before field delivery',
        'Mixing raw compost manure directly into the drip irrigation distribution mainlines',
        'Exposing black polyethylene pipes to direct flame treatment'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'Drip systems require fine filtration (120-150 mesh) and periodic chlorination or acid flushes to prevent biological and mineral clogging.'
    }),
    (n) => ({
      q: `In crop rotation trial plot #${(n % 10) + 1}, an agronomist pairs nitrogen-depleting cereal crops with legumes. Why does this improve sustainable soil fertility?`,
      opts: [
        'Symbiotic Rhizobia bacteria in legume root nodules fix atmospheric nitrogen directly into the soil',
        'Legume leaves reflect 99% of sunlight, preventing weeds from germinating',
        'Legumes absorb excess sodium ions and convert them into calcium carbonate',
        'Cereal crops produce natural fungicides that eradicate all soil bacteria'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'Legume root nodules host nitrogen-fixing bacteria that replenish bioavailable soil nitrogen for subsequent crop cycles.'
    }),
    (n) => ({
      q: `An agricultural soil test shows a slightly acidic pH of ${(5.2 + (n % 10) * 0.1).toFixed(1)}. Which amendment is standard agronomic practice to raise the soil pH toward neutrality?`,
      opts: [
        'Agricultural Limestone (Calcium Carbonate / Dolomite)',
        'Elemental Sulfur and Aluminum Sulfate',
        'High-concentration Hydrochloric Acid solutions',
        'Pure Nitrogen fertilizer in excessive quantities'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'Agricultural lime neutralizes soil acidity, increasing pH to optimize nutrient availability for crop roots.'
    })
  ],
  Biology: [
    (n) => ({
      q: `In genetic analysis of cross #${(n % 50) + 1}, two heterozygous parents (Aa x Aa) are mated. What is the probability that an offspring will express the dominant phenotype?`,
      opts: [
        '75% (3 in 4 offspring)',
        '25% (1 in 4 offspring)',
        '50% (1 in 2 offspring)',
        '100% (all offspring)'
      ],
      correct: 0,
      diff: 'easy',
      exp: 'A monohybrid cross of Aa x Aa produces AA (25%), Aa (50%), and aa (25%). The dominant phenotype appears in 75% of progeny.'
    }),
    (n) => ({
      q: `In cellular biochemistry cycle #${(n % 10) + 1}, how many net molecules of ATP are produced per molecule of glucose during complete aerobic cellular respiration?`,
      opts: [
        'Approximately 30 to 32 ATP molecules',
        'Exactly 2 ATP molecules only',
        'Over 120 ATP molecules',
        'Zero ATP molecules (only heat is released)'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'Aerobic respiration yields approximately 30-32 net ATP per glucose across glycolysis, the citric acid cycle, and oxidative phosphorylation.'
    }),
    (n) => ({
      q: `During DNA replication phase ${(n % 3) + 1}, which enzyme synthesizes short RNA primers required for DNA Polymerase to initiate strand elongation?`,
      opts: [
        'RNA Primase',
        'DNA Ligase',
        'Topoisomerase',
        'Reverse Transcriptase'
      ],
      correct: 0,
      diff: 'medium',
      exp: 'DNA polymerases require a free 3\'-OH group provided by RNA Primase synthesizing an initial complementary RNA primer.'
    }),
    (n) => ({
      q: `In an expanding ecological population model with carrying capacity K=${(n * 250 + 1000).toLocaleString()} individuals, what happens when population size N exceeds K?`,
      opts: [
        'Mortality increases and reproduction slows, bringing population size back toward or below carrying capacity',
        'The species undergoes immediate spontaneous speciation into multiple new genera',
        'The physical landmass expands logarithmically to accommodate the new population',
        'All natural predators in the ecosystem cease hunting behavior completely'
      ],
      correct: 0,
      diff: 'hard',
      exp: 'When N exceeds K, density-dependent limiting factors (food scarcity, disease, territory competition) reduce growth rate below zero.'
    })
  ]
};

let questionCounter = 1000;

export const questionGenerator = {
  /**
   * Generates a single dynamic question for a sector.
   * Rotates and shuffles options so correctIndex is randomly distributed (0 to 3).
   */
  generateQuestion({ category = 'Programming', difficulty = 'medium', seed = Date.now() }) {
    const pool = SECTOR_TOPICS[category] || SECTOR_TOPICS.Programming;
    const generators = PROCEDURAL_GENERATORS[category] || PROCEDURAL_GENERATORS.Programming;

    // Use procedural generator to guarantee unique dynamic questions
    let raw;
    if (generators && generators.length > 0) {
      const gen = generators[seed % generators.length];
      raw = gen(seed);
    } else {
      raw = pool[seed % pool.length];
    }

    // Shuffle options while tracking the correct answer
    const originalOptions = raw.opts.map((text, idx) => ({
      text,
      isCorrect: idx === raw.correct
    }));

    const shuffled = shuffleArray(originalOptions);
    const correctIndex = shuffled.findIndex(opt => opt.isCorrect);

    questionCounter++;

    return {
      category,
      difficulty: raw.diff || difficulty,
      question: raw.q,
      options: shuffled.map(o => o.text),
      correctIndex,
      explanation: raw.exp,
      active: true
    };
  },

  /**
   * Generates a batch of distinct, high-quality questions for a given sector or across all 5 sectors.
   */
  generateBatch({ category, count = 10, difficulty, excludeExistingTexts = new Set() }) {
    const sectors = category
      ? [category]
      : ['CA', 'Healthcare', 'Programming', 'Agriculture', 'Biology'];

    const generated = [];
    let attempts = 0;
    const maxAttempts = count * 20;

    while (generated.length < count && attempts < maxAttempts) {
      attempts++;
      const currentCategory = sectors[generated.length % sectors.length];
      const seed = Math.floor(Math.random() * 100000) + attempts;

      const q = this.generateQuestion({
        category: currentCategory,
        difficulty: difficulty || (attempts % 3 === 0 ? 'easy' : attempts % 3 === 1 ? 'medium' : 'hard'),
        seed
      });

      const normText = q.question.trim().toLowerCase();
      if (!excludeExistingTexts.has(normText)) {
        excludeExistingTexts.add(normText);
        generated.push(q);
      }
    }

    return generated;
  },

  /**
   * Attempts to fetch external trivia questions from Open Trivia DB when reachable.
   * Maps Computers -> Programming, Science & Nature -> Biology.
   * Gracefully returns empty array if network is unavailable or rate limited.
   */
  async fetchExternalQuestions({ category = 'Programming', count = 5 }) {
    try {
      // Map our sectors to OpenTDB categories if compatible
      const categoryMap = {
        Programming: 18, // Computers
        Biology: 17 // Science & Nature
      };

      const categoryId = categoryMap[category];
      if (!categoryId) return [];

      const url = `https://opentdb.com/api.php?amount=${count}&category=${categoryId}&type=multiple`;
      const res = await fetch(url, { headers: { 'User-Agent': 'AtelierQuiz/1.0' } });
      if (!res.ok) return [];

      const data = await res.json();
      if (!data.results || data.results.length === 0) return [];

      // HTML entity decoder
      const decodeHtml = (str) => {
        return str
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
      };

      return data.results.map(item => {
        const decodedQ = decodeHtml(item.question);
        const decodedCorrect = decodeHtml(item.correct_answer);
        const decodedIncorrect = item.incorrect_answers.map(decodeHtml);

        const optionsRaw = [
          { text: decodedCorrect, isCorrect: true },
          ...decodedIncorrect.map(t => ({ text: t, isCorrect: false }))
        ];

        const shuffled = shuffleArray(optionsRaw);
        const correctIndex = shuffled.findIndex(o => o.isCorrect);

        return {
          category,
          difficulty: item.difficulty || 'medium',
          question: decodedQ,
          options: shuffled.map(o => o.text),
          correctIndex,
          explanation: `Verified answer: "${decodedCorrect}".`,
          active: true
        };
      });
    } catch {
      // Offline or network error: return empty array to trigger procedural fallback
      return [];
    }
  }
};
