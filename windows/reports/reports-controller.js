define([
  '../../windows/reports/reports-view.js',
  '../../scripts/services/hotkeys-service.js',
  '../../scripts/constants/backend-states.js',
  '../../scripts/constants/window-names.js',
], function (
  ReportsView,
  HotkeysService,
  BackendState,
  WindowNames
  ) {

  class ReportsController {
    constructor() {
      window._controller = this;

      this.reportsView = new ReportsView(this);

      this._eventListener = this._eventListener.bind(this);

      //document.getElementById('rankings-tab').addEventListener('click', this.rankingsClicked.bind(this));

      let mainWindow = overwolf.windows.getMainWindow();

      if (mainWindow.loggedIn == BackendState.LOGGED_IN)
        this.reportsView.onLoginSuccessful(mainWindow.guildsAndCharacters);
      else
        this.reportsView.loggedOut();
    }

    windowClosed() {
      let mainWindow = overwolf.windows.getMainWindow();
      if (mainWindow)
        mainWindow.eventBus.removeListener(this._eventListener);
    }

    run() {
      // listen to events from the event bus from the main window,
      // the callback will be run in the context of the current window
      let mainWindow = overwolf.windows.getMainWindow();
      mainWindow.eventBus.addListener(this._eventListener);
    }

    loadReport(code, fight) {
      const src = `${mainWindow.game.origin()}/reports/${code}#fight=${fight ?? 'last'}`;
      const newIframe = $(`<iframe src="${src}" id="report-frame" allowfullscreen sandbox="allow-scripts allow-modals allow-forms allow-same-origin"></iframe>`);
      newIframe.insertAfter($(this.reportsView._iframe));
      $(this.reportsView._iframe).remove();
      this.reportsView._iframe = newIframe[0];
    }

    _eventListener(eventName, data) {
      switch (eventName) {
        case "windowClosed": {
          if ((data == WindowNames.REPORTS && !window.inGame) || (data == WindowNames.REPORTS_IN_GAME && window.inGame))
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

        case 'loggedIn': {
          this.reportsView.onLoginSuccessful(data);
          break;
        }

        case 'loggedOut': {
          this.reportsView.loggedOut();
          break;
        }

        case 'reportsUpdated': {
          this.reportsView.reportsUpdated(data);
          break;
        }

        case 'viewLogInGame': {
          this.reportsView.selectReport(data.code, data.fight);
          break;
        }
      }
    }
  }


  return ReportsController;
});
