define([
  '../BaseAppView.js',
  "../../scripts/constants/window-names.js",
  "../../scripts/services/windows-service.js",
  '../../scripts/constants/hotkeys-ids.js',
], function (BaseAppView, WindowNames, WindowsService, HOTKEYS) {

  class InGameView extends BaseAppView {
    constructor(controller) {
      super();

      this._controller = controller;

      this._mainWindow = overwolf.windows.getMainWindow();
      
      this._selectedVersion = this._mainWindow.storage.version();
      this._selectedLanguage = this._mainWindow.lang.language();

      this._toolbar = document.getElementById('toolbar');
      document.getElementById('livelog-button').addEventListener('click', this.liveLogButtonClicked.bind(this));
      document.getElementById('livelog-processing-button').addEventListener('click', this.liveLogButtonClicked.bind(this));
      document.getElementById('characters-button').addEventListener('click', this.charactersButtonClicked.bind(this));
      document.getElementById('reports-button').addEventListener('click', this.reportsButtonClicked.bind(this));
      document.getElementById('guilds-button').addEventListener('click', this.guildsButtonClicked.bind(this));

      this._notification = document.getElementById('notification');
      this._notificationText = document.getElementById('notification-text');
      this._notificationDismissButton = document.getElementById('notification-dismiss-button');
      this.dismissNotification = this.dismissNotification.bind(this);
      this._notificationDismissButton.addEventListener('click', this.dismissNotification);

      this._footer = document.getElementById('footer');
      this._hotkeyHelp = document.getElementById('hotkey-help');

      this._toggleVisibilityHotkey = document.getElementById('toggle-visibility-hotkey');
      this._editToggleVisibilityHotkey = document.getElementById('edit-toggle-visibility-hotkey');
      this.updateToggleVisibilityHotkey = this.updateToggleVisibilityHotkey.bind(this);

      this._callWipeHotkey = document.getElementById('call-wipe-hotkey');
      this._editCallWipeHotkey = document.getElementById('edit-call-wipe-hotkey');
      this.updateCallWipeHotkey = this.updateCallWipeHotkey.bind(this);

      this.updateEditHotkeyLinks();

      document.getElementById('call-wipe-hotkey-help').addEventListener('mouseenter', this.showCallWipeHelp.bind(this));
      document.getElementById('call-wipe-hotkey-help').addEventListener('mouseleave', this.hideHotkeyHelp.bind(this));

      this._charactersBadge = document.getElementById('characters-badge');
    }

    async autoSize() {
      const locale = this._mainWindow.lang._localeString;

      switch (locale) {
        case 'es':
          await WindowsService.changeSize(WindowNames.IN_GAME, 300, 107);
          break;
        case 'fr':
          await WindowsService.changeSize(WindowNames.IN_GAME, 310, 107);
          break;
        case 'it':
          await WindowsService.changeSize(WindowNames.IN_GAME, 310, 107);
          break;
        case 'br':
          await WindowsService.changeSize(WindowNames.IN_GAME, 300, 107);
          break;
        case 'ru':
          await WindowsService.changeSize(WindowNames.IN_GAME, 330, 107);
          break;
        case 'jp':
          await WindowsService.changeSize(WindowNames.IN_GAME, 330, 112);
          break;
        case 'ko':
          await WindowsService.changeSize(WindowNames.IN_GAME, 280, 112);
          break;
        default:
          await WindowsService.changeSize(WindowNames.IN_GAME, 280, 107);
          break;
      }
    }

    async liveLogButtonClicked(evt) {
      await WindowsService.restoreOrMinimize(WindowNames.LIVELOG);
    }

    async charactersButtonClicked(evt) {
      await WindowsService.restoreOrMinimize(WindowNames.CHARACTERS_IN_GAME);
      const state = await WindowsService.getWindowState(WindowNames.CHARACTERS_IN_GAME);
      if (state === 'normal') {
        await WindowsService.minimizeIfOpen(WindowNames.REPORTS_IN_GAME);
        await WindowsService.minimizeIfOpen(WindowNames.GUILDS_IN_GAME);
        await WindowsService.close(WindowNames.CHARACTERS);
      }
    }

    async guildsButtonClicked(evt) {
      await WindowsService.restoreOrMinimize(WindowNames.GUILDS_IN_GAME);
      const state = await WindowsService.getWindowState(WindowNames.GUILDS_IN_GAME);
      if (state === 'normal') {
        await WindowsService.minimizeIfOpen(WindowNames.REPORTS_IN_GAME);
        await WindowsService.minimizeIfOpen(WindowNames.CHARACTERS_IN_GAME);
      }
    }

    async reportsButtonClicked(evt) {
      await WindowsService.restoreOrMinimize(WindowNames.REPORTS_IN_GAME);
      const state = await WindowsService.getWindowState(WindowNames.REPORTS_IN_GAME);
      if (state === 'normal') {
        await WindowsService.minimizeIfOpen(WindowNames.CHARACTERS_IN_GAME);
        await WindowsService.minimizeIfOpen(WindowNames.GUILDS_IN_GAME);
      }
    }

    updateToggleVisibilityHotkey(hotkey) {
      this._toggleVisibilityHotkey.textContent = hotkey;
    }

    updateCallWipeHotkey(hotkey) {
      this._callWipeHotkey.textContent = hotkey;
    }

    showCallWipeHelp() {
      this._hotkeyHelp.innerHTML = '<div>' + this._mainWindow.lang.trans('call_wipe_help') + '</div>';
      this._toolbar.style.display = 'none';
      this._hotkeyHelp.style.display = 'flex';
    }

    hideHotkeyHelp() {
      this._hotkeyHelp.style.display = 'none';
      this._toolbar.style.display = 'flex';
    }

    updateEditHotkeyLinks() {
      overwolf.games.getRunningGameInfo(result => {
        if (!result.success) return;

        const gameId = result.classId;

        this._editToggleVisibilityHotkey.href = `overwolf://settings/games-overlay?hotkey=${HOTKEYS.TOGGLE_VISIBILITY}&gameId=${gameId}`;
        this._editCallWipeHotkey.href = `overwolf://settings/games-overlay?hotkey=${HOTKEYS.CALL_WIPE}&gameId=${gameId}`;
      });
    }

    updateLiveLogButtonIcon(iconName, color) {
      const icon = document.querySelector('#livelog-button .toolbar-icon');
      if (icon) {
        icon.className = 'toolbar-icon zmdi zmdi-' + iconName;
        icon.style.color = color ?? 'white';
      }
    }

    showProcessingIcon() {
      document.getElementById('livelog-button').style.display = 'none';
      document.getElementById('livelog-processing-button').style.display = 'flex';
    }

    hideProcessingIcon() {
      document.getElementById('livelog-button').style.display = 'flex';
      document.getElementById('livelog-processing-button').style.display = 'none';
    }

    async setNotification(notificationText, dismissable, autoDismiss) {
      this._notificationText.innerHTML = notificationText;

      this._toolbar.style.display = 'none';
      this._footer.style.display = 'none';
      this._notification.style.display = 'flex';
      this._notificationDismissButton.style.display = dismissable ? 'block' : 'none';

      if (this._dismissNotificationTimeout)
        clearTimeout(this._dismissNotificationTimeout);

      if (autoDismiss)
        this._dismissNotificationTimeout = setTimeout(this.dismissNotification, 10000);

      const inGameWindowState = await WindowsService.getWindowState(WindowNames.IN_GAME);
      this.minimizeInGameWindowAfterNotification = inGameWindowState !== 'normal';

      await WindowsService.restore(WindowNames.IN_GAME);
    }

    async dismissNotification() {
      this._toolbar.style.display = 'flex';
      this._footer.style.display = 'grid';
      this._notification.style.display = 'none';

      if (this.minimizeInGameWindowAfterNotification)
        await WindowsService.minimizeIfOpen(WindowNames.IN_GAME);
    }

    groupApplicantsUpdated(groupApplicants, badgeCount) {
      if (groupApplicants.length === 0 || badgeCount === 0) {
        this._charactersBadge.style.display = 'none';
        return;
      }

      this._charactersBadge.innerText = badgeCount !== undefined ? badgeCount : groupApplicants.length;
      this._charactersBadge.style.display = 'block';
    }
  };

  return InGameView;
});