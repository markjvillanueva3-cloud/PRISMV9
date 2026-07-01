---
name: prism-scientific-packages
description: "Reference for 60+ Python packages for scientific computing, ML, and manufacturing analysis. Adapted from K-Dense-AI/claude-scientific-skills."
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "scientific", "packages"
- User asks about machining parameters, process physics, or material behavior related to this topic.
- "Reference for 60+ Python packages for scientific computing, ML, and manufacturing analysis. Adapted from K-Dense-AI/claude-scientific-skills."

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-scientific-packages")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-scientific-packages") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What scientific parameters for 316 stainless?"
→ Load skill: skill_content("prism-scientific-packages") → Extract relevant scientific data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot packages issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Scientific Packages Reference v1.0
## Python Packages for Manufacturing Intelligence
## CORE SCIENTIFIC COMPUTING

### NumPy - Numerical Computing Foundation
```python
import numpy as np

# Array operations for manufacturing data
cutting_forces = np.array([120.5, 135.2, 128.7, 142.1])
mean_force = np.mean(cutting_forces)
std_force = np.std(cutting_forces)

# Matrix operations for kinematics
rotation_matrix = np.array([
    [np.cos(theta), -np.sin(theta), 0],
    [np.sin(theta), np.cos(theta), 0],
    [0, 0, 1]
])

# Linear algebra for optimization
coefficients = np.linalg.solve(A, b)
eigenvalues, eigenvectors = np.linalg.eig(stiffness_matrix)
```

### SciPy - Scientific Algorithms
```python
from scipy import optimize, interpolate, signal, stats

# Optimization for cutting parameters
result = optimize.minimize(
    objective_function,
    x0=[1000, 0.1, 2.0],  # Initial: rpm, feed, depth
    bounds=[(500, 15000), (0.01, 0.5), (0.5, 10)],
    method='SLSQP'
)

# Interpolation for material properties
kc_interp = interpolate.interp1d(
    hardness_values, 
    kc_values, 
    kind='cubic'
)

# Signal processing for vibration analysis
frequencies, psd = signal.welch(vibration_data, fs=10000)

# Statistics for process capability
capability = stats.norm.ppf(0.99865) - stats.norm.ppf(0.00135)
```

### Pandas - Data Analysis
```python
import pandas as pd

# Load manufacturing data
materials_df = pd.read_json('materials_database.json')
machines_df = pd.read_csv('machine_specs.csv')

# Query and filter
steel_materials = materials_df[
    (materials_df['iso_group'] == 'P') & 
    (materials_df['hardness'] > 200)
]

# Aggregation
material_stats = materials_df.groupby('category').agg({
    'kc1_1': ['mean', 'std'],
    'mc': ['mean', 'std'],
    'hardness': ['min', 'max']
})

# Time series for tool wear
wear_data = pd.DataFrame({
    'time': timestamps,
    'flank_wear': wear_measurements
}).set_index('time')
wear_rate = wear_data['flank_wear'].diff() / wear_data.index.diff().total_seconds()
```
## MACHINE LEARNING

### Scikit-learn - Classical ML
```python
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

# Predict surface roughness from cutting parameters
pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('model', RandomForestRegressor(n_estimators=100, random_state=42))
])

# Cross-validation
scores = cross_val_score(pipeline, X_train, y_train, cv=5, scoring='r2')
print(f"R² = {scores.mean():.3f} ± {scores.std():.3f}")

# Hyperparameter tuning
param_grid = {
    'model__n_estimators': [50, 100, 200],
    'model__max_depth': [5, 10, 20, None],
    'model__min_samples_split': [2, 5, 10]
}
grid_search = GridSearchCV(pipeline, param_grid, cv=5, scoring='r2')
grid_search.fit(X_train, y_train)
```

### XGBoost / LightGBM - Gradient Boosting
```python
import xgboost as xgb
import lightgbm as lgb

# XGBoost for tool life prediction
xgb_model = xgb.XGBRegressor(
    n_estimators=100,
    learning_rate=0.1,
    max_depth=6,
    objective='reg:squarederror'
)

# LightGBM for faster training on large datasets
lgb_model = lgb.LGBMRegressor(
    n_estimators=100,
    learning_rate=0.1,
    num_leaves=31
)
```

### PyTorch - Deep Learning
```python
import torch
import torch.nn as nn

# Neural network for cutting force prediction
class CuttingForceNet(nn.Module):
    def __init__(self, input_size=10, hidden_size=64):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_size, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, 3)  # Fx, Fy, Fz
        )
    
    def forward(self, x):
        return self.layers(x)

# Training loop
model = CuttingForceNet()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
criterion = nn.MSELoss()

for epoch in range(100):
    optimizer.zero_grad()
    predictions = model(X_train_tensor)
    loss = criterion(predictions, y_train_tensor)
    loss.backward()
    optimizer.step()
```
## OPTIMIZATION

### SciPy Optimization
```python
from scipy.optimize import minimize, differential_evolution

# Multi-objective (weighted sum)
def objective(x):
    rpm, feed, depth = x
    mrr = rpm * feed * depth  # Material removal rate
    roughness = predict_roughness(rpm, feed, depth)
    tool_wear = predict_wear(rpm, feed, depth)
    return -mrr + 10*roughness + 5*tool_wear  # Minimize

result = minimize(
    objective,
    x0=[5000, 0.15, 1.5],
    bounds=[(1000, 15000), (0.05, 0.5), (0.5, 5)],
    method='SLSQP'
)

# Global optimization
result = differential_evolution(
    objective,
    bounds=[(1000, 15000), (0.05, 0.5), (0.5, 5)],
    maxiter=1000,
    seed=42
)
```

### DEAP - Evolutionary Algorithms
```python
from deap import base, creator, tools, algorithms

# NSGA-II for multi-objective optimization
creator.create("FitnessMulti", base.Fitness, weights=(1.0, -1.0))  # Max MRR, Min Ra
creator.create("Individual", list, fitness=creator.FitnessMulti)

toolbox = base.Toolbox()
toolbox.register("attr_rpm", random.uniform, 1000, 15000)
toolbox.register("attr_feed", random.uniform, 0.05, 0.5)
toolbox.register("attr_depth", random.uniform, 0.5, 5)
toolbox.register("individual", tools.initCycle, creator.Individual,
                 (toolbox.attr_rpm, toolbox.attr_feed, toolbox.attr_depth), n=1)
toolbox.register("population", tools.initRepeat, list, toolbox.individual)

# Run NSGA-II
population = toolbox.population(n=100)
result, logbook = algorithms.eaMuPlusLambda(
    population, toolbox, 
    mu=100, lambda_=200,
    cxpb=0.7, mutpb=0.2, 
    ngen=50
)
```
## VISUALIZATION

### Matplotlib - Publication Quality Plots
```python
import matplotlib.pyplot as plt

# Cutting force vs depth plot
fig, ax = plt.subplots(figsize=(10, 6))
ax.plot(depth_values, forces_x, 'b-', label='Fx', linewidth=2)
ax.plot(depth_values, forces_y, 'r--', label='Fy', linewidth=2)
ax.plot(depth_values, forces_z, 'g-.', label='Fz', linewidth=2)
ax.set_xlabel('Depth of Cut (mm)', fontsize=12)
ax.set_ylabel('Cutting Force (N)', fontsize=12)
ax.legend(fontsize=10)
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('cutting_forces.png', dpi=300)
```

### Plotly - Interactive Plots
```python
import plotly.graph_objects as go
import plotly.express as px

# 3D surface for response surface methodology
fig = go.Figure(data=[go.Surface(z=roughness_surface, x=rpm_grid, y=feed_grid)])
fig.update_layout(
    title='Surface Roughness Response Surface',
    scene=dict(
        xaxis_title='RPM',
        yaxis_title='Feed (mm/rev)',
        zaxis_title='Ra (μm)'
    )
)
fig.write_html('response_surface.html')
```
## STATISTICS

### StatsModels - Statistical Analysis
```python
import statsmodels.api as sm
from statsmodels.formula.api import ols

# ANOVA for process parameters
model = ols('roughness ~ C(rpm_level) + C(feed_level) + C(rpm_level):C(feed_level)', 
            data=experiment_data).fit()
anova_table = sm.stats.anova_lm(model, typ=2)

# Regression for tool life model (Taylor equation)
# log(T) = log(C) - n*log(V)
X = sm.add_constant(np.log(cutting_speeds))
model = sm.OLS(np.log(tool_lives), X).fit()
n = -model.params[1]  # Taylor exponent
C = np.exp(model.params[0])  # Taylor constant
```
## PHYSICS CALCULATIONS

### SymPy - Symbolic Math
```python
import sympy as sp

# Define cutting force equation symbolically
kc, h, b, mc = sp.symbols('kc h b mc', positive=True)
F = kc * b * h**(1 - mc)

# Differentiate for sensitivity analysis
dF_dh = sp.diff(F, h)
print(f"∂F/∂h = {dF_dh}")

# Solve equations
v, n, D = sp.symbols('v n D', positive=True)
rpm_eq = sp.Eq(n, 1000 * v / (sp.pi * D))
v_solved = sp.solve(rpm_eq, v)[0]
```

### Pint - Unit Handling
```python
import pint
ureg = pint.UnitRegistry()

# Calculate with units
rpm = 5000 * ureg.rpm
diameter = 10 * ureg.mm
cutting_speed = (np.pi * diameter * rpm).to('m/min')
print(f"Cutting speed: {cutting_speed:.1f}")

# Feed rate calculation
feed_per_tooth = 0.1 * ureg.mm
num_flutes = 4
feed_rate = (feed_per_tooth * num_flutes * rpm).to('mm/min')
print(f"Feed rate: {feed_rate:.1f}")
```
## FILE I/O

### JSON Handling
```python
import json

# Load materials database
with open('materials.json', 'r') as f:
    materials = json.load(f)

# Save calculation results
results = {
    'material': 'AISI_4140',
    'optimal_params': {
        'rpm': 3500,
        'feed': 0.12,
        'depth': 2.0
    },
    'predicted_roughness': 1.2
}
with open('results.json', 'w') as f:
    json.dump(results, f, indent=2)
```

### Excel Integration
```python
import openpyxl
from openpyxl.utils.dataframe import dataframe_to_rows

# Read Excel
wb = openpyxl.load_workbook('machine_data.xlsx')
ws = wb.active

# Write results to Excel
wb = openpyxl.Workbook()
ws = wb.active
for r in dataframe_to_rows(results_df, index=False, header=True):
    ws.append(r)
wb.save('output.xlsx')
```
## QUICK INSTALL

```bash
# Core scientific stack
pip install numpy scipy pandas matplotlib

# ML packages
pip install scikit-learn xgboost lightgbm

# Deep learning
pip install torch torchvision

# Optimization
pip install deap

# Statistics
pip install statsmodels

# Utilities
pip install pint sympy openpyxl plotly
```
## PACKAGE CHEAT SHEET

| Task | Package | Key Function |
|------|---------|--------------|
| Array math | numpy | `np.array`, `np.linalg` |
| Optimization | scipy.optimize | `minimize`, `differential_evolution` |
| Interpolation | scipy.interpolate | `interp1d`, `griddata` |
| Statistics | scipy.stats | `norm`, `t`, `chi2` |
| Data frames | pandas | `DataFrame`, `read_csv` |
| ML models | sklearn | `RandomForestRegressor`, `Pipeline` |
| Gradient boost | xgboost, lightgbm | `XGBRegressor`, `LGBMRegressor` |
| Neural nets | torch | `nn.Module`, `nn.Linear` |
| Multi-obj opt | deap | `algorithms.eaMuPlusLambda` |
| Regression | statsmodels | `OLS`, `anova_lm` |
| Symbolic math | sympy | `symbols`, `diff`, `solve` |
| Units | pint | `UnitRegistry` |
| Plotting | matplotlib | `plt.plot`, `plt.savefig` |
| Interactive | plotly | `go.Figure`, `px.scatter` |
**v1.0.0 | Adapted from K-Dense-AI + PRISM context | 2026-01-30**
