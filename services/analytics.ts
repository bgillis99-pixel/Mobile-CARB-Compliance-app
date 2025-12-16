declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// TODO: REPLACE THIS WITH YOUR ACTUAL GOOGLE ANALYTICS MEASUREMENT ID
// You can get this from https://analytics.google.com/ -> Admin -> Data Streams
export const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; 

export const initGA = () => {
  if (typeof window === 'undefined') return;
  
  // Prevent double initialization
  if (window.gtag) return;

  // 1. Load the Google Analytics Script
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.async = true;
  document.head.appendChild(script);

  // 2. Initialize Data Layer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){window.dataLayer.push(arguments);}
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: window.location.pathname,
    send_page_view: false // We will track page views manually for SPA
  });
  
  console.log(`[Analytics] Initialized. Don't forget to set your ID in services/analytics.ts`);
};

export const trackPageView = (pageName: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_title: pageName,
      page_location: window.location.href,
      page_path: `/${pageName.toLowerCase()}`
    });
  }
};

export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
};
