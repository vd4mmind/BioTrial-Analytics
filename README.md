
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
   - **Configurable Scenarios**:
     - **Standard Efficacy**: Clear separation between drug and placebo.
     - **Mixed Results**: Simulates subpopulations where the drug fails.
     - **Failed Trial**: No statistical difference between arms.
     - **High Placebo**: Strong placebo response masking drug effect.
   - Comparison across three arms: **Placebo**, **Drug X 1mg**, and **Drug X 2mg**.

### 2. **Advanced Analytics & Visualization**
   - **Trend Charts**: Longitudinal line charts showing Mean ± SEM over 24 weeks (supports Log Scale).
   - **Distribution Plots**: Scatter plots to visualize patient-level variability.
   - **Efficacy Heatmaps**: At-a-glance view of % change across all biomarkers.
   - **AUC Analysis**: Automatic calculation of **Area Under the Curve** using the trapezoidal rule to quantify sustained treatment effects.

### 3. **Statistical Power Calculator**
   - A robust statistical engine for planning biomarker studies.
   - **Supported Platforms**:
     - **ELISA / Immunoassays** (Low Plex)
     - **Olink Flex** (Targeted Panel)
     - **Olink Explore HT** (High-Plex Proteomics)
     - **SomaScan** (Aptamer-based Proteomics)
   - **Advanced Logic**:
     - Accounts for **Biological Variability** (Inter-patient heterogeneity) vs Technical Noise.
     - Applies **Bonferroni Correction** for high-multiplex assays (e.g., adjusting Alpha for 7000+ analytes).
     - Interactive **Power Curve** and Variance Breakdown.

### 4. **User Feedback & Tracking**
   - Built-in **Usage Analytics** to track session time and event interactions.
   - **Feedback System** allows users to rate the application and submit comments.
   - **Admin Dashboard** (accessible via footer) to view aggregated stats and logs.

### 5. **Customizable Endpoints**
   - Add custom biomarkers dynamically.
   - Define specific units, directionality (Lower vs. Higher is better), and baseline means.

---

## 📖 How to Use

### **Navigating the Dashboard**
1. **Toggle Views**: Use the top navigation tabs to switch between the **Analytics Dashboard** and the **Power Calculator**.
2. **Simulate Data**: 
   - Select a scenario (e.g., "Mixed Results") from the dropdown.
   - Click `Simulate` to regenerate the patient dataset.
3. **Deep Dive**: 
   - Select a biomarker from the dropdown (e.g., hs-CRP, HbA1c).
   - Toggle between **Absolute Values** and **% Change from Baseline**.
   - Switch between Bar Chart, Table, and **AUC Plot** views.

### **Using the Power Calculator**
1. Choose an **Assay Platform** (e.g., SomaScan, Olink Explore). The app automatically presets typical CVs and Analyte counts.
2. Adjust **Biological CV** (Patient Heterogeneity) to see how it impacts the sample size more than technical noise.
3. For High-Plex assays, observe how **Multiple Testing Correction** increases the required N.
4. Use the **"Set as Reference"** feature to compare different study designs side-by-side.

---

## 🛠️ Tech Stack

This application is built using a modern, type-safe, and performance-oriented stack:

- **Frontend Framework**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Visualization**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Build Tool**: Vite

---

## 💻 Local Development

To run this application locally on your machine:

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/biotrial-analytics.git
   cd biotrial-analytics
   ```

2. **Install Dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser to `http://localhost:5173` (or the port shown in your terminal).

---

## 👤 Developer

**Vivek Das**  
*Functional Prototype Development*

> *Disclaimer: This application is a functional prototype. All data presented is simulated for demonstration purposes only and should not be used for clinical decision-making.*
