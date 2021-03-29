define([
  '../../windows/guilds/guilds-view.js',
  '../../scripts/services/hotkeys-service.js',
  '../../scripts/constants/backend-states.js',
  '../../scripts/constants/window-names.js'
], function (
  GuildsView,
  HotkeysService,
  BackendState,
  WindowNames
  ) {

  class GuildsController {

    constructor() {
      window._controller = this;

      this.guildsView = new GuildsView(this);

      this._eventListener = this._eventListener.bind(this);

      this.currentGuild = "";

      let mainWindow = overwolf.windows.getMainWindow();

      if (mainWindow.loggedIn == BackendState.LOGGED_IN)
        this.guildsView.onLoginSuccessful(mainWindow.guildsAndCharacters);
      else
        this.guildsView.loggedOut();
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

    loadGuild(link) { 
      this.currentGuild = link;
      document.getElementById('guild-frame').setAttribute('src', link);
    }

    loadGuildById(id) { 
      let link = mainWindow.game.origin() + "/guild/id/" + id;
      document.getElementById('guild-frame').setAttribute('src', link);
    }

    _eventListener(eventName, data) {
      switch (eventName) {
        case "windowClosed": {
          if ((data == WindowNames.GUILDS && !window.inGame) || (data == WindowNames.GUILDS_IN_GAME && window.inGame))
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
          this.guildsView.onLoginSuccessful(data);
          break;
        }

        case 'loggedOut': {
          this.guildsView.loggedOut();
          break;
        }

      }
    }
  }


  return GuildsController;
});
