<div align="center">
  <img src="./logo.svg" alt="BioTrial Analytics Logo" width="120" />
  <br />
  <br />
  <h1>BioTrial Analytics</h1>
  <p>
    <b>A professional clinical trial visualization dashboard for analyzing biomarker trends across study arms.</b>
  </p>
</div>

---

## 🚀 Features

### 1. **Simulated Cohorts (Data Dashboard)**
   - Instantly generate realistic Phase IIb clinical trial data for **N=600 patients**.
   - **Configurable Scenarios**: Standard Efficacy, Mixed Results, Failed Trial, and High Placebo.
   - Comparison across three arms: **Placebo**, **Drug X 1mg**, and **Drug X 2mg**.

### 2. **Advanced Analytics & Visualization**
   - **Trend Charts**: Longitudinal Mean ± SEM over 24 weeks with Log Scale support.
   - **Distribution Plots**: Scatter plots for patient-level variability.
   - **AUC Analysis**: Automated Area Under the Curve calculation via the trapezoidal rule.

### 3. **Statistical Power Calculator (Proteomics)**
   - Plan studies for **ELISA, Olink, and SomaScan**.
   - Accounts for **Biological Variability** vs Technical Noise.
   - Applies **Bonferroni Correction** for high-multiplex proteomics (up to 7000+ analytes).

### 4. **Single Cell (scRNA-seq) Power Analysis**
   - **Pseudobulk LMM**: Models power for paired designs using pseudobulk aggregation.
   - **Dropout Modeling**: Simulates rare cell type detection based on sequencing depth and abundance.

### 5. **Customizable Endpoints**
   - Define custom biomarkers with specific units, directionality, and baseline means.

### 6. **Longitudinal Spatial Power Planning (PoweREST) — [LATEST UPDATE]**
   - **Methodology**: Implements the **PoweREST** hierarchical framework for Spatial Transcriptomics (ST).
   - **Strict Design Sync**: Visual simulation and sensitivity curves are strictly bounded by the planned study duration ($T$).
   - **Hierarchical Variance**: Models variance decomposition across Subjects, Slices, and Technical replicates.
   - **Tissue Dynamics**: Interactive simulation of tissue remodeling (e.g., immune infiltration) across clinical timepoints.
   - **Efficiency Frontier**: Optimize N vs. Cost vs. Power across platforms like Xenium, Visium, and CosMx.

---

## 💻 Local Development

Follow these steps to run the application on your local machine:

### **1. Prerequisites**
- Install [Node.js](https://nodejs.org/) (version 18.0 or higher recommended).
- A modern web browser with ESM support.

### **2. Installation**
Clone the repository or download the source files, then navigate to the project root and install the necessary dependencies:
```bash
npm install
```

### **3. Running the App**
Start the local development server:
```bash
npm run dev
# or
npm start
```
The application will typically be available at `http://localhost:5173` (depending on your environment).

---

## 📖 How to Use

### **Dashboard Navigation**
- Use the top navigation tabs to switch between analytics and planning modules.
- Upload your own data using the **Upload** button (supports .csv and .json).

### **Spatial Power Planning**
1. Navigate to the **Spatial (ST)** tab.
2. Select your **Assay Platform** (e.g., 10x Xenium) to load cost and resolution presets.
3. Use the **Trial Design** slider to set the planned study duration (Wk 4 to Wk 52).
4. **Design Constraint**: Note that the "Interim Analysis" and "Tissue Simulation" are automatically restricted to the duration you select.
5. Observe the **Tissue Dynamics Simulation** to visualize disease remodeling over time.
6. Adjust the **Interim Analysis** dropdown to see how power is impacted if the study ends at an earlier timepoint.

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