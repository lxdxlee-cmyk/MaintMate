# MaintainMate (USMC 28XX Tactical Journal)

MaintainMate is a local-first, AI-powered technical journal designed specifically for the USMC 28XX (Ground Electronics Maintenance) community. It provides a rugged, utilitarian interface for tracking serialized equipment (Gear), managing SL-3 templates, and logging maintenance activities (ERO) with AI-driven diagnostic support.

## Features

- **Tactical Gear Inventory**: Track nomenclature, serial numbers, NSNs, and TAMCNs.
- **SL-3 Technical Templates**: Create blueprints for equipment classes with built-in technical specs and component breakdowns.
- **AI-Powered Fault Analysis**: Leverage Genkit and Gemini to analyze faults against historical data and technical manual specs.
- **Grouped ERO History**: Maintenance logs are organized by Service Request (SR#) for lifecycle tracking.
- **Local-First Architecture**: Built with Dexie.js for high performance and offline reliability in tactical environments.

## How to push to GitHub

To push this project to your own GitHub repository, follow these steps in your terminal:

1. **Initialize Git**:
   ```bash
   git init
   ```

2. **Add all files**:
   ```bash
   git add .
   ```

3. **Commit the changes**:
   ```bash
   git commit -m "Initial commit of MaintainMate"
   ```

4. **Create a repository on GitHub**:
   Go to [github.com/new](https://github.com/new) and create a new repository.

5. **Link to your GitHub repo**:
   Replace `USERNAME` and `REPO_NAME` with your details:
   ```bash
   git remote add origin https://github.com/USERNAME/REPO_NAME.git
   ```

6. **Push the code**:
   ```bash
   git branch -M main
   git push -u origin main
   ```

## Development

This project uses:
- **Next.js 15 (App Router)**
- **Tailwind CSS** (USMC Tactical Palette)
- **Shadcn UI**
- **Dexie.js** (IndexedDB)
- **Genkit** (AI Flows)
