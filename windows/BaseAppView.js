define([
  '../scripts/services/drag-service.js',
  "../../scripts/services/windows-service.js",
  '../../scripts/constants/window-names.js',
], function (DragService, WindowService, WindowNames) {

  class BaseAppView {
    constructor() {
      // Background window:
      this._backgroundWindow = overwolf.windows.getMainWindow();
      // Page elements:
      this._backButton = document.getElementById('back-button');
      this._forwardButton = document.getElementById('forward-button');
      this._refreshButton = document.getElementById('refresh-button');
      this._closeButton = document.getElementById('closeButton');
      this._minimizeHeaderButton = document.getElementById('minimizeButton');
      this._header = document.getElementsByClassName('app-header')[0];
      this._iframe =
        document.getElementById('report-frame') ||
        document.getElementById('character-frame') ||
        document.getElementById('guild-frame');
      // Initialize
      this.init();
    }

    init() {
      // Enable dragging on this window
      overwolf.windows.getCurrentWindow(result => {
        window.inGame = result.window.name.endsWith('in_game') || result.window.name === WindowNames.LIVELOG;

        if (window.inGame && result.window.name !== WindowNames.IN_GAME) {
          if (result.window.name !== WindowNames.LIVELOG)
            this._header.style.display = 'none';

          document.querySelector('body').classList.add('in-game');
        }

        this.dragService = new DragService(result.window, this._header);

        // Listen to X button click
        if (this._closeButton) {
          this._closeButton.addEventListener('click', () => {
            if (window.inGame) {
              overwolf.windows.minimize(result.window.id);
            } else {
              overwolf.windows.close(result.window.id);
            }
          });
        }
        // Listen to minimize click
        if (this._minimizeHeaderButton) {
          this._minimizeHeaderButton.addEventListener('click', () => {
            overwolf.windows.minimize(result.window.id);
          });
        }

        if (this._iframe) {
          this.bindIframeControls();
        }
      });
    }

    bindIframeControls() {
      this._backButton?.addEventListener('click', this.iframeBack.bind(this))
      this._forwardButton?.addEventListener('click', this.iframeForward.bind(this))
      this._refreshButton?.addEventListener('click', this.iframeRefresh.bind(this))
    }

    iframeBack() {
      this._iframe.contentWindow.postMessage('goBack', '*');
    }

    iframeForward() {
      this._iframe.contentWindow.postMessage('goForward', '*');
    }

    iframeRefresh() {
      this._iframe.contentWindow.postMessage('refresh', '*');
    }
  }

  return BaseAppView;
});