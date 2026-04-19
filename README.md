# UrbanOracle

UrbanOracle is a geospatial intelligence platform that analyzes the physical structure of cities and identifies structurally similar urban environments worldwide using machine learning.

The system represents cities as high-dimensional feature vectors derived from measurable geographic and urban form characteristics, enabling objective comparison based on spatial structure rather than semantic labels.

---

## Overview

Users select a geographic region on an interactive map. The platform extracts urban features from the selected area, constructs a structured feature vector, and performs similarity search against a precomputed global dataset of cities.

The output is a ranked list of the most structurally similar cities based on quantitative spatial analysis.

---

## Core Capabilities

- Interactive geographic region selection (bounding box or point-based selection)
- Extraction of urban features from OpenStreetMap data
- Road network analysis (density, topology, and structural entropy)
- Building footprint analysis (density and spatial regularity)
- Hydrological feature detection (rivers, water bodies, proximity)
- Terrain and elevation variance analysis
- Green space distribution estimation
- Machine learning-based similarity search across global cities
- Ranked similarity output with comparative results

---

## Feature Representation

Each city or region is encoded as a structured feature vector consisting of:

- Road network density
- Road network entropy (grid-like vs organic structure)
- Building density
- Building layout regularity
- Water coverage ratio
- River and hydrological density
- Elevation variance
- Green space ratio

---

## Technology Stack

### Frontend
- Leaflet.js
- React (Vite) or Vanilla JavaScript
- HTML, CSS

### Backend
- Python
- FastAPI
- Uvicorn

### Geospatial Processing
- OpenStreetMap (Overpass API)
- Custom geospatial feature extraction pipeline

### Machine Learning
- NumPy
- Scikit-learn
- K-Nearest Neighbors / Cosine Similarity

---

## Licence

This project is licensed under the MIT License.
