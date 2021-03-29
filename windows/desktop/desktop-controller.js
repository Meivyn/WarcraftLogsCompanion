define([
  '../../windows/desktop/desktop-view.js',
  '../../scripts/constants/backend-states.js',
  '../../scripts/constants/window-names.js',
  '../BaseAppView.js',
  "../../scripts/services/windows-service.js",
  "../../scripts/services/ad-service.js",
], function (DesktopViewBuilder, BackendState, WindowNames, BaseAppView, WindowService, AdService) {

  class DesktopController {
    constructor() {
      this._eventListener = this._eventListener.bind(this);

      overwolf.windows.getCurrentWindow(async (result) => {
        window.inGame = result.window.name.endsWith('in_game') || result.window.name === WindowNames.LIVELOG;

        let mainWindow = overwolf.windows.getMainWindow();
        const DesktopView = DesktopViewBuilder(BaseAppView, WindowNames, WindowService, AdService)
        this.desktopView = new DesktopView(mainWindow);

        const {
          loggedIn,
          guildsAndCharacters,
          reportUIMode,
          currentPage,
          progressStatusText,
          progressStatusTextElementId,
          lastReportCode,
          errorText,
          warningText,
        } = mainWindow;

        if (loggedIn === BackendState.LOGGED_IN) {
          await this.desktopView.onLoginSuccessful(guildsAndCharacters);
        } else if (loggedIn === BackendState.LOGIN_FAILED) {
          this.desktopView.fillInLoginForm();
        }

        if (reportUIMode && !window.inGame) {
          this.desktopView.setReportUIMode(reportUIMode);
        }
        if (currentPage && (!window.inGame || reportUIMode === 'livelog')) {
          this.desktopView.selectReportPage(currentPage);
        }
        if (progressStatusText && progressStatusTextElementId) {
          this.desktopView.setProgressStatusText(progressStatusText, progressStatusTextElementId);
        }
        if (lastReportCode) {
          this.desktopView.setLastReportCode(lastReportCode);
        }
        if (errorText) {
          this.desktopView.setErrorText(errorText);
        }
        if (warningText) {
          this.desktopView.setWarningText(warningText);
        }
      });
    }

    windowClosed() {
      let mainWindow = overwolf.windows.getMainWindow();
      if (mainWindow)
        mainWindow.eventBus.removeListener(this._eventListener);
    }

    _eventListener(eventName, data) {
      switch (eventName) {
        case 'autoLoginFailed': {
          this.desktopView.fillInLoginForm();
          break;
        }
        case 'loginFailed': {
          this.desktopView.onLoginFailed(data);
          break;
        }
        case 'loggedIn': {
          this.desktopView.onLoginSuccessful(data);
          break;
        }

        case 'cancelOrFinish': {
          this.desktopView.cancelOrFinish(data);
          break;
        }

        case 'handleLogDeletionAndArchival': {
          this.desktopView.handleLogDeletionAndArchival(data);
          break;
        }

        case 'loggedOut': {
          this.desktopView.loggedOut();
          break;
        }

        case "windowClosed": {
          if ((!window.inGame && data === WindowNames.DESKTOP) || (window.inGame && data === WindowNames.LIVELOG))
            this.windowClosed();
          break;
        }

        case "reload": {
          let mainWindow = overwolf.windows.getMainWindow();
          if (mainWindow)
            mainWindow.eventBus.removeListener(this._eventListener);
          window.location.reload();
          break;
        }

        case "setErrorText": {
          this.desktopView.setErrorText(data)
          break;
        }

        case "setWarningText": {
          this.desktopView.setWarningText(data)
          break;
        }
        
        case "updateProgress": {
          const { pct, id } = data
          this.desktopView.updateProgress(pct, id)
          break;
        }

        case "setProgressStatusText": {          
          const { text, id } = data
          this.desktopView.setProgressStatusText(text, id)
          break
        }

        case "setUploadProgressContainer": {
          this.desktopView.setUploadProgressContainer(data)
          break
        }

        case "setCancelButtonVisible": {
          this.desktopView.setCancelButtonVisible(data)
          break
        }

        case "setReportUIMode": {
          this.desktopView.setReportUIMode(data.mode,  data.doNotUpdateFileBrowsers)
          break
        }

        case "selectReportPage": {
          this.desktopView.selectReportPage(data)
          break
        }

        case "setLastReportCode": {
          this.desktopView.setLastReportCode(data)
          break
        }

        case "showFightSelectionUI": {
          const { collectedScannedRaids, logVersion } = data
          this.desktopView.showFightSelectionUI(collectedScannedRaids, logVersion)
          break          
        }

        case "deletionSucceeded": {
          this.desktopView.showDeletionSucceededMessage();
          break;
        }

        case "deletionFailed": {
          this.desktopView.showDeletionFailedMessage();
          break;
        }

        case "archivalSucceeded": {
          this.desktopView.showArchivalSucceededMessage();
          break;
        }

        case "archivalFailed": {
          this.desktopView.showArchivalFailedMessage();
          break;
        }

        case "setLogDirectory": {
          this.desktopView.setLogDirectory(data.directoryUploadName, data.updateFileInputs);
          break;
        }
       }
    }

    run() {
      let mainWindow = overwolf.windows.getMainWindow();
      mainWindow.eventBus.addListener(this._eventListener);
    }
  }

  return DesktopController;
});
