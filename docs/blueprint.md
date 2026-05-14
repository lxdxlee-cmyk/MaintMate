# **App Name**: MaintainMate

## Core Features:

- Equipment Asset Management: Allow users to create, view, and edit detailed profiles for equipment assets, including type, identifiers, owner, parent/child relationships, and linked references/manuals.
- Maintenance Log Recorder: Enable quick and detailed recording of maintenance actions, including fault observations, repair steps, parts replaced, technician, timestamps, notes, photos, and outcome.
- Search & Filterable History: Provide robust search and filtering capabilities across equipment assets, past maintenance logs, troubleshooting history, and technical notes to quickly find relevant information.
- Local-First Data Storage: Utilize IndexedDB via Dexie.js to store all application data directly on the user's device, ensuring offline access, data persistence between updates, and local data ownership.
- PWA Offline Capabilities: Implement Progressive Web App (PWA) features to make the application installable, highly responsive, and fully functional offline on mobile devices for field-oriented use.
- AI-Powered Fault Analysis Tool: A generative AI tool that assists maintainers by analyzing historical fault descriptions for specific equipment and suggesting common problems, potential causes, or relevant troubleshooting steps.

## Style Guidelines:

- Primary color: Muted slate blue (#385E94), conveying reliability, focus, and technical organization without being overly clinical.
- Background color: Very light, desaturated grey-blue (#F0F2F4), providing a clean and easily readable canvas appropriate for a light color scheme in varied environments.
- Accent color: Vibrant turquoise (#26E0DA), offering clear visual distinction for interactive elements and highlights against the primary and background colors.
- Body and headline font: 'Inter' (sans-serif), chosen for its modern, neutral, and highly legible characteristics, ensuring clarity and ease of reading in a field environment.
- Use clear, universally recognizable, and functional line-art icons that support quick understanding and navigation, minimizing cognitive load for maintainers under stress.
- Prioritize a responsive, mobile-first layout with clean information hierarchy, prominent search, card-based displays for equipment and logs, and a consistent bottom navigation bar for core actions to minimize taps.
- Incorporate subtle, performance-optimized animations for state changes and navigation transitions, enhancing perceived speed and providing smooth user feedback without distractions.