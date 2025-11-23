<div align="center">
  <img src="./logo.svg" alt="BioTrial Analytics Logo" width="350" />
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
   - Comparison across three arms: **Placebo**, **Drug X 1mg**, and **Drug X 2mg**.
   - Data is standardized to baseline to simulate realistic variance and treatment effects.

### 2. **Advanced Analytics & Visualization**
   - **Trend Charts**: Longitudinal line charts showing Mean ± SEM over 24 weeks.
   - **Distribution Plots**: Scatter plots to visualize patient-level variability.
   - **Efficacy Heatmaps**: At-a-glance view of % change across all biomarkers.
   - **AUC Analysis**: Automatic calculation of **Area Under the Curve** using the trapezoidal rule to quantify sustained treatment effects.

### 3. **Statistical Power Calculator**
   - A dedicated module for planning future studies.
   - Calculate required **Sample Size (N)** based on:
     - Assay Type (ELISA, MSD, Olink)
     - Coefficient of Variation (CV)
     - Expected Effect Size (%)
   - Interactive **Power Curve** visualization.

### 4. **Customizable Endpoints**
   - Add custom biomarkers dynamically.
   - Define specific units, directionality (Lower vs. Higher is better), and baseline means.

---

## 📖 How to Use

### **Navigating the Dashboard**
1. **Toggle Views**: Use the top navigation tabs to switch between the **Analytics Dashboard** and the **Power Calculator**.
2. **Simulate Data**: Click the `Simulate New Cohort` button to regenerate the patient dataset with new random seeds.
3. **Deep Dive**: 
   - Select a biomarker from the dropdown (e.g., hs-CRP, HbA1c).
   - Choose a specific timepoint (Week 4, 12, 24).
   - Toggle between **Absolute Values** and **% Change from Baseline**.

### **Using the Power Calculator**
1. Select your **Study Phase** (Phase II vs III).
2. Choose an **Assay Platform** (e.g., Olink, ELISA) to automatically set the Coefficient of Variation (CV), or adjust the slider manually.
3. Input the **Control Mean** and **Expected Change (%)**.
4. View the calculated **Required Sample Size** per arm and the dynamic Power Curve.

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