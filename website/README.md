# Klovio promotional website

Simple static site to promote the Klovio app. Same theme as the mobile app (off-white background, pastel green accent). Footer is green with rounded top corners.

## Pages

- **index.html** – Landing: hero, “everything you need” features, “all in one place” bullets, getting started (3 steps), download strip, FAQ preview
- **faq.html** – Full FAQ (what is Klovio, reminders, import, spending, subscriptions, free plan, data, sync, clear data, notifications, categories, contact)
- **support.html** – How-to and contact
- **privacy.html** – Privacy policy

## Run locally

Open `index.html` in a browser, or serve the folder with any static server:

```bash
# From the website folder
npx serve .
# or
python -m http.server 8080
```

Then open `http://localhost:3000` (serve) or `http://localhost:8080` (Python).

## Customize

- Contact email used across the site: getklovio@gmail.com.
- Add real App Store / Google Play links in `index.html` when the app is published.
- Colors and spacing match `../constants/Theme.ts` (light theme).
