# Copilot Instructions for 3D Printing Estimation Platform

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview

This is a **3D Printing Estimation Automation Web Platform** built with:

- **Frontend**: Remix, TypeScript, TailwindCSS, Zustand, three.js
- **Backend**: FastAPI (Python), Orca Slicer CLI
- **Architecture**: Feature-Sliced Design (FSD)
- **AI**: SentenceTransformer or Ollama for model classification

## Core Features

1. **Model Upload & Preview**: STL/3MF/OBJ file support with WebGL 3D preview
2. **Auto Slicing Parameters**: Bambu Lab settings reference with smart recommendations
3. **Slicing & Cost Estimation**: Orca Slicer CLI integration for G-code generation
4. **Results Visualization**: Cost breakdown, printing time, filament usage

## Architecture Guidelines (Feature-Sliced Design)

### Layers Structure:

- `/app` - Application layer (Remix routes)
- `/pages` - Page compositions
- `/widgets` - Complex UI components (EstimationCard, ModelViewer, SlicerSettings)
- `/features` - Business logic features
- `/entities` - Business entities
- `/shared` - Shared utilities

### Feature Modules:

- `features/estimate` - Cost calculation, settings recommendation
- `features/uploader` - File upload and validation
- `features/preview` - Three.js 3D model preview
- `features/slicer` - Backend slicing integration
- `entities/model` - 3D model data structures
- `entities/settings` - Print settings structures
- `shared/api` - API clients and backend communication
- `shared/ui` - Reusable UI components

## Code Guidelines

1. Use TypeScript strictly with proper typing
2. Follow FSD import rules (only import from lower layers)
3. Use Zustand for state management
4. Implement responsive design with TailwindCSS
5. Use three.js for 3D model rendering
6. Follow Remix conventions for routing and data loading

## AI Integration

- Use SentenceTransformer for model classification (decorative/functional/assembly)
- Implement smart parameter recommendations based on model type
- Support Bambu Lab speed/power/cool settings templates

## API Integration

- FastAPI backend for slicing operations
- Orca Slicer CLI integration
- Support for .3mf settings save/load
- Filament cost calculation with material database
