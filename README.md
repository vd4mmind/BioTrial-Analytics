<div align="center">
  <img src="./logo.svg" alt="BioTrial Analytics Logo" width="120" />
  <br />
  <br />
  <h1>BioTrial Analytics</h1>
  <p>
    <b>Precision Clinical Trial Visualization & Multi-Omics Power Planning</b>
  </p>
  
  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind" />
    <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
  </p>
</div>

---

## 🔬 Overview

**BioTrial Analytics** is a high-fidelity clinical trial simulation and power planning platform. It bridges the gap between **retrospective discovery** (visualizing longitudinal biomarker trends) and **prospective study design** (calculating statistical power for high-dimensional omics).

Built for biostatisticians and clinical researchers, the platform implements the **PoweREST** framework for hierarchical spatial modeling and advanced multiplicity correction for proteomics and metabolomics.

---

## 🏗️ Core Pillars

### 1. **Clinical Discovery Dashboard (Retrospective)**
*   **Simulated Cohorts**: Generate realistic Phase IIb data for **N=600 patients** across three study arms (Placebo, Drug X 1mg, Drug X 2mg).
*   **Longitudinal Trends**: Visualize Mean ± SEM over 24 weeks with support for Log Scale and % Change from Baseline.
*   **Pharmacodynamics**: Automated **AUC (Area Under the Curve)** calculation using the trapezoidal rule to assess biomarker sustainability.
*   **Distribution Analysis**: Patient-level scatter plots to identify responders vs. non-responders.

### 2. **Multi-Omics Power Designer (Prospective)**
*   **Proteomics**: Support for **ELISA, Olink, and SomaScan**. Models biological variability vs. technical noise.
*   **Metabolomics & Lipidomics**: Plan discovery studies for **Metabolon, Nightingale, and Biocrates**. 
*   **Multiplicity Tax**: Integrated **Bonferroni, FDR, and FWER** correction engines to handle high-plex platforms (up to 7000+ analytes).
*   **Correlation Modeling**: Accounts for feature-level correlation in lipidomics to optimize class-level enrichment power.

### 3. **Single-Cell & Spatial Transcriptomics**
*   **scRNA-seq (Pseudobulk LMM)**: Models power for paired designs using pseudobulk aggregation and rare cell type detection constraints.
*   **Spatial Power (PoweREST)**: Implements the hierarchical variance framework:
    *   **Variance Decomposition**: Subjects ($\sigma^2_p$), Slices ($\sigma^2_s$), and Technical replicates ($\sigma^2_t$).
    *   **Longitudinal Gain**: Models the statistical benefit of repeated measures: $G_{lon} = 1 + (T-1)\rho$.
*   **Tissue Dynamics**: Interactive Canvas-based simulation of tissue remodeling and immune infiltration.

---

## 📐 Statistical Framework

BioTrial Analytics isn't just a UI; it's a statistical engine.
- **Hierarchical Modeling**: Uses nested variance components for spatial and single-cell designs.
- **Noise Calibration**: Pre-calibrated noise profiles for major omics platforms (e.g., Olink Explore, SomaScan v4).
- **Efficiency Frontier**: Automated optimization of Subject N vs. Slice Count vs. Cost to find the precision-budgeting "sweet spot."

---

## 💻 Tech Stack

- **Frontend**: React 19 (Functional Components, Hooks)
- **State Management**: Context API & Optimized Local State
- **Visualization**: Recharts (Custom SVG labeling) & HTML5 Canvas (High-performance simulations)
- **Styling**: Tailwind CSS (Mobile-first, responsive design)
- **Icons**: Lucide React
- **Type Safety**: Strict TypeScript 5.x

---

## 🚀 Getting Started

### **1. Prerequisites**
- [Node.js](https://nodejs.org/) (v18.0+)
- NPM or Yarn

### **2. Installation**
```bash
git clone https://github.com/your-repo/biotrial-analytics.git
cd biotrial-analytics
npm install
```

### **3. Development**
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

---

## 👤 Developer
**Vivek Das** | *Expert Functional Prototype Development*

> [!IMPORTANT]
> **Disclaimer**: This application is a functional prototype. All data and power estimates are simulated and should not be used for actual clinical decision-making without independent statistical validation.
