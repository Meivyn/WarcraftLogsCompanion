define([
  '../../windows/characters/characters-view.js',
  '../../scripts/services/hotkeys-service.js',
  '../../scripts/constants/backend-states.js',
  '../../scripts/constants/window-names.js'
], function (
  CharactersView,
  HotkeysService,
  BackendState,
  WindowNames
  ) {

  class CharactersController {

    constructor() {
      window._controller = this;

      this.charactersView = new CharactersView(this);

      this._eventListener = this._eventListener.bind(this);

      this.displayMode = null;
      this.raidType = null;

      this.currentCharacter = "";

      let mainWindow = overwolf.windows.getMainWindow();
      if (mainWindow.game.supportsGear()) {
        document.getElementById('rankings-tab').style.display = '';
        document.getElementById('gear-tab').style.display = '';

        let displayMode = mainWindow.storage.getVersionedStoredItem("characterDisplayMode");
        if (!displayMode)
          displayMode = "rankings";
        else
          this.displayMode = displayMode;
      
        $("#" + displayMode + "-tab").addClass("selected");
      }

      if (mainWindow.game.prefix() == "warcraft" && mainWindow.storage.version() != "classic") {
        document.getElementById('raids-tab').style.display = '';
        document.getElementById('dungeons-tab').style.display = '';

        let raidType = mainWindow.storage.getVersionedStoredItem("characterRaidType");
        if (!raidType)
          this.raidType = "raids";
        else
          this.raidType = raidType;

        $("#" + this.raidType + "-tab").addClass("selected");
      }

      if (mainWindow.loggedIn == BackendState.LOGGED_IN)
        this.charactersView.onLoginSuccessful(mainWindow.guildsAndCharacters);
      else
        this.charactersView.loggedOut();
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

      if (mainWindow._latestInfoUpdate)
        mainWindow.onInfoUpdate(mainWindow._latestInfoUpdate);
    }

    loadCharacter(link) { 
      this.currentCharacter = link;
      
      let src = link + '?';
      if (this.displayMode)
        src += 'displayMode=' + this.displayMode + '&';
      if (this.raidType == "dungeons")
        src += 'zone=25';

      document.getElementById('character-frame').setAttribute('src', src);
    }

    loadCharacterById(id) { 
      let link = mainWindow.game.origin() + "/character/id/" + id;
      this.currentCharacter = link;
      
      let src = link + '?';
      if (this.displayMode)
        src += 'displayMode=' + this.displayMode + '&';
      if (this.raidType == "dungeons")
        src += 'zone=25';

      document.getElementById('character-frame').setAttribute('src', src);
    }

    _eventListener(eventName, data) {
      switch (eventName) {
        case "windowClosed": {
          if ((data == WindowNames.CHARACTERS && !window.inGame) || (data == WindowNames.CHARACTERS_IN_GAME && window.inGame))
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
          this.charactersView.onLoginSuccessful(data);
          break;
        }

        case 'loggedOut': {
          this.charactersView.loggedOut();
          break;
        }

        case 'charactersUpdated': {
          this.charactersView.charactersUpdated(data);
          break;
        }

        case 'groupApplicantsUpdated': {
          this.charactersView.groupApplicantsUpdated(data.groupApplicants, data.badgeCount);
          break;
        }

        case "clearApplicantBadgeCount": {
          this.charactersView.clearApplicantBadgeCount();
          break;
        }
      }
    }
  }


  return CharactersController;
});
