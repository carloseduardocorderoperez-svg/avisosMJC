# MJC Avisos IA – Source of Truth Document

This document describes the current architecture of the "mjc-avisos-ia" project and defines a recommended workflow for adding new features in a professional, incremental and safe way. The idea is for this file to be the functional and technical source of truth for the project.

---

## 1. Project goal

The "MJC Avisos IA" project automates the generation of parish announcements from a PDF of slides:

1. The user uploads a PDF with announcements.
2. The backend converts the PDF pages into images.
3. An AI service analyzes each slide and extracts structured announcements.
4. The announcements are stored in a canonical JSON file.
5. From that JSON, a final HTML page is generated with the announcements ordered and grouped by category.
6. The frontend allows reviewing, editing and adding announcements more comfortably.

This flow allows going from "presentation" to "announcements web page" almost automatically, while keeping a single structured source of data.

---

## 2. High-level architecture

### 2.1. Folder structure (quick view)

Project root:

- package.json (scripts to run client and server in parallel)
- client/ (React + Vite frontend)
- server/ (Node + Express + OpenAI backend)
- data/ (structured output: avisos.json)
- images/ (images generated from the PDF)
- output/ (generated HTML with announcements)
- template/ (base HTML template)
- uploads/ (PDFs uploaded by the user)

### 2.2. Frontend – client/

Technologies:

- React + Vite
- Global state in client/src/store/avisosStore.js
- Components and pages in client/src/

Main pieces:

- client/src/App.jsx: defines SPA routes/pages.
- client/src/pages/: high-level views (Editor, Avisos, Preview, etc.).
- client/src/components/: reusable components (Navbar, PdfUploader, etc.).
- client/src/components/blocks/: content block components (TextoBlock, ImagenBlock, ListaBlock, etc.) representing parts of an announcement.
- client/src/styles/: global and block-specific styles.

Frontend role:

- Load the list of announcements from the backend (via avisosStore or HTTP calls).
- Allow creating/editing announcements and their blocks.
- Show previews of how the generated announcements will look.

### 2.3. Backend – server/

Technologies:

- Node.js + Express
- Helper modules to process PDFs, images and AI calls.
- openai for text/image analysis.

Main backend flow (summary):

1. POST /upload-pdf
   - pdfProcessor.convertPdfToImages converts the PDF into images and saves them in images/slide_*.png.

2. POST /analyze-slides
   - aiExtractor.analyzeAllSlides calls the AI to analyze each slide.
   - Generates data/avisos.json file with the canonical announcements structure.

3. POST /avisos
   - Receives the announcements JSON (new or edited from the frontend).
   - Saves data/avisos.json.
   - Calls htmlGenerator to regenerate output/avisos_generados.html using template/avisos_template.html.

Other details:

- driveUploader.js and groupSlides.js exist but may be partially used or legacy.
- server/index.js registers routes and configures CORS.

### 2.4. Data and HTML template

- Canonical data file: data/avisos.json

   Simplified multi-set structure:

   {
      "sets": [
         {
            "id": string,          // internal unique id (UUID)
            "code": string,        // custom external code (must be unique)
            "date": string,        // e.g. "28/02/26", editable in the Dashboard
            "title": string,       // optional, defaults to "AVISOS ZONALES"
            "avisos": [
               {
                  "id": string | number,
                  "orden": number,
                  "titulo": string,
                  "categoria": "admin" | "eventos" | "pastoral" | "formacion" | "extras",
                  "bloques": [
                     // content blocks (text, image, list, table, etc.)
                  ]
               }
            ],
            "createdAt": string,   // ISO timestamp
            "updatedAt": string    // ISO timestamp
         }
      ]
   }

- HTML template: template/avisos_template.html
  - Defines sections for announcement categories (ADMIN, EVENTOS, PASTORAL, FORMACION, EXTRAS).
  - Uses tokens such as {{ADMIN}}..{{EXTRAS}} that htmlGenerator replaces with the content generated from avisos.json.

---

## 3. How to run the project locally

### 3.1. Requirements

- Node.js LTS version installed.
- Required environment variables for OpenAI in server/ (.env, not detailed here for security).

### 3.2. Main commands

From the project root:

1. Install client and server dependencies (once):
   - cd client && npm install
   - cd ../server && npm install

2. Run client and server in parallel from the root:
   - npm install (to have npm-run-all in the root)
   - npm run dev

   This runs:
   - npm run dev --prefix client (Vite at http://localhost:5173)
   - npm run dev --prefix server (Express at the port configured in server/index.js)

3. Frontend only (if you want to work only on UI):
   - cd client
   - npm run dev

4. Backend only (to debug APIs):
   - cd server
   - npm run dev

---

## 4. Development conventions and best practices

### 4.1. Code style

- Use React functional components and hooks.
- Keep components small with a single responsibility.
- Name variables and functions descriptively and consistently.
- Avoid duplicating logic: extract helpers when the same pattern is reused.
- Prefer component composition over huge monolithic components.
- Keep state management centralized where it makes sense (avisosStore, contexts, custom hooks).

### 4.2. Frontend

- Place new pages under client/src/pages/.
- Place reusable components under client/src/components/.
- Place announcement-specific content blocks under client/src/components/blocks/.
- Avoid accessing announcements by array index when possible; prefer using id to avoid inconsistencies.
- Keep styles under client/src/styles/ or CSS Modules according to current convention.

### 4.3. Backend

- Define new routes in server/index.js or in separate modules imported from there.
- Keep business logic separate from routing (for example, functions in aiExtractor.js, pdfProcessor.js, etc.).
- Handle errors with try/catch and always respond with clear JSON { error, message }.
- Do not block the event loop unnecessarily; use async/await for I/O.

### 4.4. Data and contracts

- Any change in data/avisos.json structure must be documented here.
- Keep current categories (admin, eventos, pastoral, formacion, extras) unless there is a strong reason to change them.
- If new fields are added to an announcement or its blocks, describe them in the data model section.

---

## 5. Standard process to add a new feature

This section describes how new features should be planned to keep development professional and safe.

### 5.1. Step 1 – Define the feature

Before asking the AI for help or writing code, write down:

- Feature name.
- Goal (what problem it solves and for whom).
- Scope (frontend, backend or both).
- Assumptions and constraints.

Example:

- Feature: Filter by category in the Avisos view.
- Goal: Allow the user to see only announcements of a specific category.
- Scope: Frontend only.
- Constraints: Do not change data/avisos.json structure.

### 5.2. Step 2 – Write a development plan

Always create a plan before touching code. The plan should be:

- Numbered (list of steps).
- Small steps (ideally 3–7 steps).
- Each step must be verifiable (can be tested somehow).

You can write this plan in this same document under a specific subsection for the feature, for example:

- Add at the end of the document:

  ### Feature: Category filter (in progress)

  1. Review how announcements are loaded and stored in avisosStore.
  2. Identify the page/component that lists announcements (for example, Avisos.jsx).
  3. Add a category selector and connect it to global state.
  4. Filter the announcements list by the selected category.
  5. Test manually and adjust UI.

### 5.3. Step 3 – Implement in short iterations

For each step in the plan:

1. Explain (even briefly) what you are going to change and in which files.
2. Make the minimal changes necessary for that step.
3. Save and verify that the project compiles/runs (npm run dev or build as appropriate).

### 5.4. Step 4 – Test before moving to the next step

Before moving to the next step in the plan, always:

- Run available tests (if there are automated tests for that area).
- If there are no tests, perform at least manual testing:
  - Frontend: navigate to the affected view, test typical flows and edge cases.
  - Backend: call relevant endpoints (via Postman, curl or from the frontend) and inspect responses.

If something fails, fix it before moving on.

### 5.5. Step 5 – Update this document (when applicable)

When you finish a feature that changes the architecture or data contracts:

- Update the architecture description if new important modules were added.
- Update the data model if avisos.json structure changed.
- Add a subsection in a "Feature history" section (can be created at the end) with:
  - Feature name.
  - Approximate date.
  - Summary of changes.

---

## 6. Recommended prompt to request a new feature from the AI

This section defines a prompt you can use with GitHub Copilot (GPT-5.1 model) or another AI to help you implement a new feature following best practices, with a clear plan and tests at each step.

Copy and paste the following prompt and fill in the fields in brackets:

---

I want you to act as a senior full‑stack developer working in the "mjc-avisos-ia" repository.

Project context:
- Frontend: React + Vite in the client/ folder.
- Backend: Node + Express in the server/ folder.
- Main data source: data/avisos.json with the list of announcements.
- HTML template: template/avisos_template.html, which is filled with the announcements to generate output/avisos_generados.html.

Feature I want to implement:
- Name: [FEATURE NAME]
- Goal: [DESCRIBE WHAT PROBLEM IT SOLVES]
- Scope: [frontend/backend/both]
- Relevant constraints: [LIST ANY IMPORTANT CONSTRAINTS]

Requirements for how you work (VERY IMPORTANT):

1. Before writing any code, create a detailed plan of at most 7 numbered steps with small, concrete actions. The plan must respect the architecture described in DOCUMENTO_FUENTE_MJC_AVISOS_IA.md.
2. Do not write code until I confirm or adjust the plan.
3. Once the plan is approved, work step by step:
   - For each step, briefly explain what you are going to do and in which files.
   - Then show only the code changes needed for that step.
4. At each step, suggest how to test the changes BEFORE moving on:
   - Indicate which commands to run (for example, npm run dev) and which manual flows to test.
   - When it makes sense, suggest automated tests (unit or integration) and, if they do not exist, at least outline how they could be written.
5. Apply good software engineering practices:
   - Clean code, clear and consistent naming.
   - Avoid duplicated logic; extract functions/helpers when repetition appears.
   - Proper error handling and empty states.
   - Keep consistency with the current project style (folder structure, component patterns, etc.).
6. If the feature implies changes in the architecture or in the data/avisos.json structure, at the end propose which sections of DOCUMENTO_FUENTE_MJC_AVISOS_IA.md should be updated and with what information (as bullet points).

I want you to move forward only when I confirm that the tests you suggested for each step have been executed and are satisfactory.

---

## 7. Suggested next steps for the project

This section can be expanded over time with ideas for future improvements. Some examples:

- Add basic backend tests for the main endpoints.
- Add tests for critical frontend components (for example, the announcement editor).
- Improve error handling and show clear messages to the user.
- Document in more detail the format of each block type (text, image, list, table, etc.) in avisos.json.

When any of these ideas are implemented, update the corresponding section in this document.
