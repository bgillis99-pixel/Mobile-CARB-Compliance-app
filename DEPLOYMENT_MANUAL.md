# 🚀 EMPLOYEE HANDBOOK: LAUNCH PROTOCOL

**To:** New Operator
**From:** Engineering Lead
**Task:** Take "Mobile Carb Check" LIVE today.

Follow these 3 phases exactly. Do not skip steps.

---

## 📂 PHASE 1: SECURE THE CODE (GitHub)
*We need to put the files in a safe cloud storage.*

1.  **Download Files:** Make sure you have downloaded all the code files from this chat to a folder on your computer.
2.  **⚠️ CRITICAL: DELETE `package-lock.json`:** If you see a file named `package-lock.json` in your folder, **DELETE IT**. It causes deployment errors.
3.  **Create Account:** Go to [GitHub.com/join](https://github.com/join) and create a free account.
4.  **New Repo:** Click the **+** icon (top right) -> **New repository**.
    *   **Name:** `mobile-carb-check`
    *   **Visibility:** Public
    *   Click **Create repository**.
5.  **Upload:** Click the link that says **"uploading an existing file"**.
    *   Select ALL your files (`App.tsx`, `index.html`, `package.json`, `vite.config.ts`, etc.).
    *   Drag them into the window.
    *   Click the green **Commit changes** button.

---

## ⚡ PHASE 2: IGNITE THE ENGINE (Vercel)
*This turns the code into a working website.*

1.  **Create Account:** Go to [Vercel.com/signup](https://vercel.com/signup).
    *   Select **"Continue with GitHub"**.
2.  **Import Project:**
    *   On your dashboard, click **Add New...** -> **Project**.
    *   You will see `mobile-carb-check` on the list. Click **Import**.
3.  **⚠️ CRITICAL STEP (Do not miss this):**
    *   Find the section called **"Environment Variables"** and expand it.
    *   **Key:** `API_KEY`
    *   **Value:** `AIzaSyBIVTK3aqKBA9JwtXBeGbpWEgMy4tPXmtk`
    *   Click **Add**.
4.  **Launch:** Click **Deploy**.
    *   Wait ~1 minute. You will get a working link (e.g., `mobile-carb-check.vercel.app`).
    *   **Test it.** Open that link on your phone. It should work perfectly.

---

## 🌐 PHASE 3: CONNECT THE DOMAIN (Squarespace)
*www.carbcleantruckcheck.app.*

### Part A: Get the Destination (Vercel)
1.  In your Vercel Project, go to **Settings** (top tab) -> **Domains** (left menu).
2.  Type `carbcleantruckcheck.app` in the box.
3.  Click **Add**.
4.  Vercel will show an error (Invalid Configuration) and give you a number: **`76.76.21.21`**. Copy this.

### Part B: Point the Signpost (Squarespace)
1.  Log into [Squarespace Domains](https://account.squarespace.com/domains).
2.  Click `carbcleantruckcheck.app`.
3.  Click **DNS Settings** (sometimes called "Advanced DNS").
4.  **🗑️ DELETE DEFAULTS:** Look for "Squarespace Defaults" at the bottom. **Delete them** (Trash Can icon). The app won't work if you keep them.
5.  **Add Record 1 (The App):**
    *   **Type:** `A`
    *   **Host:** `@`
    *   **Data:** `76.76.21.21`
    *   Click **Save**.
6.  **Add Record 2 (The WWW):**
    *   **Type:** `CNAME`
    *   **Host:** `www`
    *   **Data:** `cname.vercel-dns.com`
    *   Click **Save**.

---

## ✅ PHASE 4: VERIFICATION
1.  Go back to **Vercel Domains** settings.
2.  It takes anywhere from **15 minutes to 24 hours** for the connection to turn Green.
3.  Once it is Green, your app is live at `https://carbcleantruckcheck.app`.
4.  **SSL is Automatic:** The "Secure" lock icon will appear automatically.

---

## 🆘 TROUBLESHOOTING

### Error: `404: NOT_FOUND Code: DEPLOYMENT_NOT_FOUND`
**Good News:** This means your Squarespace DNS is working perfectly! It is pointing to Vercel.
**The Problem:** Vercel doesn't know which project to display.
**The Fix:**
1.  Go to Vercel Dashboard -> Click your Project.
2.  Click **Settings** -> **Domains**.
3.  Type `carbcleantruckcheck.app` and click **Add**.
4.  Refresh your phone. It should work immediately.