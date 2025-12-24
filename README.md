<div align="center">
  <img src="./logo.svg" alt="BioTrial Analytics Logo" width="120" />
  <br />
  <br />
  <h1>BioTrial Analytics</h1>
  <p>
    <b>A clinical trial visualization dashboard for analyzing biomarker trends across study arms.</b>
  </p>
</div>

---

## 🚀 Features

### 1. **Simulated Cohorts (Data Dashboard)**
   - Instantly generate realistic Phase IIb clinical trial data for **N=600 patients**.
   - **Configurable Scenarios**: Standard Efficacy, Mixed Results, Failed Trial, and High Placebo.
   - Comparison across three arms: **Placebo**, **Drug X 1mg**, and **Drug X 2mg**.

### 2. **Longitudinal Spatial Power Planning (PoweREST)**
   - **Methodology**: Implements the **PoweREST** hierarchical framework for Spatial Transcriptomics (ST).
   - **Hierarchical Variance**: Models variance decomposition across Subjects, Slices, and Technical replicates.
   - **Tissue Dynamics**: Interactive simulation of tissue remodeling (e.g., immune infiltration) across 4 clinical timepoints.
   - **Sensitivity Analysis**: Calculate power curves for interim analyses, strictly bounded by planned study duration.
   - **Efficiency Frontier**: Optimize N vs. Cost vs. Power across platforms like Xenium, Visium, and CosMx.

### 3. **Advanced Analytics & Visualization**
   - **Trend Charts**: Longitudinal Mean ± SEM over 24 weeks with Log Scale support.
   - **Distribution Plots**: Scatter plots for patient-level variability.
   - **AUC Analysis**: Automated Area Under the Curve calculation via the trapezoidal rule.

### 4. **Statistical Power Calculator (Proteomics)**
   - Plan studies for **ELISA, Olink, and SomaScan**.
   - Accounts for **Biological Variability** vs Technical Noise.
   - Applies **Bonferroni Correction** for high-multiplex proteomics (up to 7000+ analytes).

### 5. **Single Cell (scRNA-seq) Power Analysis**
   - **Pseudobulk LMM**: Models power for paired designs using pseudobulk aggregation.
   - **Dropout Modeling**: Simulates rare cell type detection based on sequencing depth and abundance.

### 6. **Customizable Endpoints**
   - Define custom biomarkers with specific units, directionality, and baseline means.

---

## 📖 How to Use

### **Spatial Power Planning**
1. Navigate to the **Spatial (ST)** tab.
2. Select your **Assay Platform** (e.g., 10x Xenium) to load cost and resolution presets.
3. Use the **Trial Design** slider to set the planned study duration (Wk 4 to Wk 52).
4. Observe the **Tissue Dynamics Simulation** to visualize disease remodeling over time.
5. Adjust the **Interim Analysis** dropdown to see how power is impacted if the study ends early.

### **Dashboard Navigation**
- Use the top navigation tabs to switch between analytics and planning modules.
- Upload your own data using the **Upload** button (supports .csv and .json).

---

## 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Statistics**: Custom normal distribution and hierarchical power engines inspired by the PoweREST framework.

---

## 👤 Developer
**Vivek Das** | *Functional Prototype Development*

> *Disclaimer: This application is a functional prototype. All data and power estimates are simulated and should not be used for actual clinical decision-making.*