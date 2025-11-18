https://naveen-greyhat.github.io/courier-delivery-system/
# Blackdeal — Campus Task Marketplace

Small web app to post, accept and manage simple campus tasks (Firebase Auth + Firestore).

## Features
- Email/password authentication
- Post tasks with pickup/drop, reward and contact
- Accept tasks (helpers)
- My Profile: edit name, reg. number, section, mobile
- Real-time task feeds using Firestore snapshots
- Light/Dark theme, toast notifications, simple modals

## Important notes / security
- Current rules restrict reading full user docs to the document owner. That means other users cannot view profiles unless you relax rules or expose public fields to a separate collection.
- To keep sensitive fields private, consider copying only public fields (name, avatar, publicAbout) into `/publicProfiles/{uid}` and allow read access to that collection.
- When updating rules, test with the Firebase emulator or staging project.

## Backfill / Migration tips
- To show full names on historical tasks, run a one-off script (authenticated server-side or Cloud Function) that reads `users/{uid}` and updates `tasks` to include `requesterName` / `helperName` where missing.

## Deploy
- Any static host works (Netlify, Vercel, GitHub Pages).
- Ensure your Firebase project is configured and allowed origins include your deployed domain.

## Development notes
- Main entry: `index.html`
- Client logic: `script.js`
- Styles: `style.css`
- Firebase v8 libs are referenced in `index.html`; if upgrading to v9+, refactor imports and code.

## Contributing
- Open issues for bugs and feature requests.
- Keep UI and security behavior consistent: profile data is sensitive — prefer safe defaults.


