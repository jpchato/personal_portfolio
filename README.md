# Personal Portfolio

## Overview
This is the personal portfolio of **Jesse Pena**, showcasing his expertise as a Python Developer and Automation Engineer. It highlights his projects, professional experience, Final Fantasy Quotes API, and contact information.

## Features
- **Home Page:** Introduction and summary of skills.
- **Projects Page:** Details key automation and infrastructure projects, including:
  - Inactive Volume Deletion Automation
  - Inactive Zone Deletion on Cisco Switches
  - Splunk Data Extraction & Dashboard Creation
  - Python Automation for Infrastructure Optimization
- **Final Fantasy Quotes Page:** Dedicated page that connects to a custom API, allowing users to roll random FF quotes or browse by game, character, tags, or text search.
- **Contact Page:** Provides a way to reach out for inquiries and collaboration.

## Technologies Used
- **Frontend:** HTML, CSS, JavaScript (with FF-inspired menu styling)
- **Backend:** Node.js + Express + SQLite (Final Fantasy Quotes API)
- **Deployment:** GitHub Pages (static site) and Node hosting (API)
- **Other Integrations:** Splunk, PowerMax, NetApp, Infinidat

## Installation & Local Setup
To run this portfolio locally:
1. Clone the repository:
   ```sh
   git clone https://github.com/jpchato/personal_portfolio.git
   ```
2. Navigate to the project directory:
   ```sh
   cd personal_portfolio
   ```
3. Start the frontend (static site):
   ```sh
   python -m http.server 8000
   ```
   Then open your browser at:
   ```
   http://localhost:8000
   ```
4. Start the Final Fantasy Quotes API:
   ```sh
   npm install
   npm run dev
   ```
   The API will run at:
   ```
   http://localhost:5173
   ```

## API Endpoints
- `GET /api/health` → Health check
- `GET /api/quotes` → List quotes (supports filters & pagination)
- `GET /api/quotes/random` → Get a random quote (supports filters)
- `POST /api/quotes` → Add a new quote (requires `API_TOKEN`)

## Seeding Quotes
To bulk add quotes from JSON:
```sh
npm run seed
```
This loads quotes from `seeds/quotes.json` into the database.

## Acknowledgments
This portfolio was significantly improved with the help of **ChatGPT**, providing support for:
- Revamping the **HTML structure** for better readability and organization.
- Designing a **modern and responsive CSS layout** with Final Fantasy flair.
- Creating and structuring **Projects, Contact, API Demo, and FF Quotes pages**.
- Debugging and wiring together the **Node.js API** and frontend integration.

🚀 Huge shoutout to ChatGPT for all the assistance in modernizing and expanding this portfolio!

## License
This project is open-source and available under the MIT License.
