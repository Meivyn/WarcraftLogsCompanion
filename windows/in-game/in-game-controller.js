define([
  '../../windows/in-game/in-game-view.js',
  '../../scripts/services/hotkeys-service.js',
  '../../scripts/services/windows-service.js',
  '../../scripts/constants/backend-states.js',
  '../../scripts/constants/window-names.js'
], function (
  InGameView,
  HotkeysService,
  WindowsService,
  BackendState,
  WindowNames
  ) {

  class InGameController {

    constructor() {
      this.inGameView = new InGameView(this);
      this.inGameView.autoSize();

      this._eventListener = this._eventListener.bind(this);
      this._updateHotkey = this._updateHotkey.bind(this);

      WindowsService.getWindowState(WindowNames.CHARACTERS).then(state => {
        if (state === 'normal') {
          this.inGameView.charactersButtonClicked();
        }
      });
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

      // Update hotkey view and listen to changes:
      this._updateHotkey();
      HotkeysService.addHotkeyChangeListener(this._updateHotkey);
    }

    async _updateHotkey() {
      const toggleVisibilityHotkey = await HotkeysService.getToggleHotkey();
      const callWipeHotkey = await HotkeysService.getCallWipeHotkey();
      this.inGameView.updateToggleVisibilityHotkey(toggleVisibilityHotkey);
      this.inGameView.updateCallWipeHotkey(callWipeHotkey);
    }

    _eventListener(eventName, data) {
      switch (eventName) {
        case 'liveLogStatusChanged': {
          switch (data) {
            case 'started':
              this.inGameView.updateLiveLogButtonIcon('stop');
              break;
            case 'stopped':
              this.inGameView.updateLiveLogButtonIcon('play');
              break;
            case 'error':
              this.inGameView.updateLiveLogButtonIcon('alert-circle', 'red');
              break;
            case 'warning':
              this.inGameView.updateLiveLogButtonIcon('alert-circle', 'gold');
              break;
          }
          break;
        }
        case 'setUploadProgressContainer': {
          if (data === true) {
            this.inGameView.showProcessingIcon();
          } else {
            this.inGameView.hideProcessingIcon();
          }
          break;
        }
       
        case "windowClosed": {
          if (data == WindowNames.IN_GAME)
            this.windowClosed();
          break;
        }

        case "reload": {
          let mainWindow = overwolf.windows.getMainWindow();
          if (mainWindow)
            mainWindow.eventBus.removeListener(this._eventListener);
          window.location.reload();
          this.inGameView.autoSize();
          break;
        }

        case "setInGameNotification": {
          this.inGameView.setNotification(data.notificationText, data.dismissable, data.autoDismiss);
          break;
        }

        case "groupApplicantsUpdated": {
          this.inGameView.groupApplicantsUpdated(data.groupApplicants, data.badgeCount);
          break;
        }

        case "clearGroupApplicantBadgeCount": {
          this.inGameView.groupApplicantsUpdated([], '');
          break;
        }
      }
    }
  }


  return InGameController;
});
