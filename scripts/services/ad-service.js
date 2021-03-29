define(function () {
  class AdService {
    ensureAdIsLoaded() {
      if (document.getElementById('overwolf-ad-script'))
        return;

      function onOwAdReady() {
        window.ad = new OwAd(document.getElementById('ad'));

        overwolf.windows.getCurrentWindow(result => {
          if (!result.success)
            return;

          function onWindowStateChanged(state) {
            if (state && state.window_name === result.window.name) {

              if (state.window_state === 'minimized') {
                window.windowIsMinimized = true;
                window.ad.removeAd();
              }

              else if (state.window_previous_state === 'minimized' && state.window_state === 'normal') {
                window.windowIsMinimized = false;
                if (window.adIsVisible) {
                  window.ad.refreshAd();
                }
              }
            }
          }

          overwolf.windows.onStateChanged.removeListener(onWindowStateChanged);
          overwolf.windows.onStateChanged.addListener(onWindowStateChanged);
        })
      }

      const overwolfScript = document.createElement("script");
      overwolfScript.id = "overwolf-ad-script";
      overwolfScript.src = "http://content.overwolf.com/libs/ads/latest/owads.min.js"
      overwolfScript.async = true
      overwolfScript.addEventListener('load', onOwAdReady)

      const body = document.getElementsByTagName("body")[0]
      body.appendChild(overwolfScript);
    }

    showAd() {
      window.adIsVisible = true;

      document.body.classList.add('show-ad');

      if (window.windowIsMinimized)
        return;

      this.ensureAdIsLoaded();

      if (window.ad && window.ad.refreshAd && typeof window.ad.refreshAd === 'function') {
        window.ad.refreshAd()
      }
    }

    hideAd() {
      window.adIsVisible = false;

      document.body.classList.remove('show-ad');

      if (window.ad && window.ad.removeAd && typeof window.ad.removeAd === 'function') {
        window.ad.removeAd()
      }
    }
  }

  return AdService;
});