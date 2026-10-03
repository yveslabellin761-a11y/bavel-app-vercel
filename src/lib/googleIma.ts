const IMA_SCRIPT_ID = 'bavel-google-ima-sdk';
let imaSdkPromise: Promise<void> | null = null;

export function loadGoogleImaSdk(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Google IMA is only available in a browser.'));
  }
  if ((window as any).google?.ima) return Promise.resolve();
  if (imaSdkPromise) return imaSdkPromise;

  imaSdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.getElementById(IMA_SCRIPT_ID) as HTMLScriptElement | null
      || document.createElement('script');
    script.id = IMA_SCRIPT_ID;
    script.async = true;
    script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';

    const timeout = window.setTimeout(() => {
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
      imaSdkPromise = null;
      reject(new Error('Google IMA SDK loading timed out.'));
    }, 8000);
    const onLoad = () => {
      window.clearTimeout(timeout);
      script.removeEventListener('error', onError);
      if ((window as any).google?.ima) {
        resolve();
      } else {
        imaSdkPromise = null;
        reject(new Error('Google IMA SDK loaded without the expected API.'));
      }
    };
    const onError = () => {
      window.clearTimeout(timeout);
      script.removeEventListener('load', onLoad);
      imaSdkPromise = null;
      reject(new Error('Google IMA SDK could not be loaded.'));
    };

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!script.isConnected) document.head.appendChild(script);
  });

  return imaSdkPromise;
}
