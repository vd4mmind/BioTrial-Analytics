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

### 5. **Longitudinal Spatial Power Planning (PoweREST)**
   - **Methodology**: Implements the **PoweREST** hierarchical framework for Spatial Transcriptomics (ST).
   - **Hierarchical Variance**: Models variance decomposition across **Subjects ($\sigma^2_p$)**, **Slices ($\sigma^2_s$)**, and **Technical replicates ($\sigma^2_t$)**.
   - **Longitudinal Gain**: Mathematically models the statistical benefit of repeated measures: $G_{lon} = 1 + (T-1)\rho$.
   - **Tissue Dynamics**: Interactive Canvas-based simulation of tissue remodeling (e.g., immune infiltration) across clinical timepoints.
   - **Efficiency Frontier**: Optimize N vs. Cost vs. Power across platforms like Xenium, Visium, and CosMx.
   - **Slide-Ready Reporting**: Full y-axis labeling on sensitivity and efficiency plots for protocol publication.
   - **Export Engine**: Export raw data to CSV or generate a comprehensive **Statistical White-Paper Report** via the Print/PDF engine.

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
The application will typically be available at `http://localhost:5173`.

---

## 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Charts**: Recharts (with explicit SVG labeling and responsive margins)
- **Simulations**: High-performance HTML5 Canvas
- **Icons**: Lucide React
- **Statistics**: Custom normal distribution and hierarchical power engines inspired by the PoweREST framework.

---

## 👤 Developer
**Vivek Das** | *Functional Prototype Development*

> *Disclaimer: This application is a functional prototype. All data and power estimates are simulated and should not be used for actual clinical decision-making.*