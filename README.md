# Clean Truck Check Compliant 12/26/25 - Deployment Guide

1.  **Firebase:** 
    *   Create a project at [console.firebase.google.com](https://console.firebase.google.com/).
    *   Install Firebase Tools: `npm install -g firebase-tools`.
    *   Login: `firebase login`.
    *   Initialize: `firebase init hosting`.
    *   Select your project and set `dist` as the public directory.
2.  **GitHub:** Upload all files to a new repository.
3.  **CI/CD (Optional):** Use GitHub Actions for automatic deployment or simply run:
    *   `npm run deploy`
4.  **Domains:** 
    *   Connect your custom domain (e.g., `carbcleantruckcheck.app`) in the Firebase Hosting console.
    *   Update DNS records as provided by Firebase.
