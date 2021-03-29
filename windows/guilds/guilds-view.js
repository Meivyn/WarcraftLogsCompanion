define([
  '../BaseAppView.js',
  "../../scripts/constants/window-names.js",
  "../../scripts/services/windows-service.js",
], function (BaseAppView, WindowNames, WindowsService) {

  class GuildsView extends BaseAppView {
    constructor(controller) {
      super();

      this._controller = controller;

      this._mainWindow = overwolf.windows.getMainWindow();
      
      this._selectedVersion = this._mainWindow.storage.version();
      this._selectedLanguage = this._mainWindow.lang.language();

      document.getElementById('user-guilds').addEventListener('click', this.loadUserGuildByTarget.bind(this));
      document.getElementById('search-form').setAttribute('action', this._mainWindow.game.origin() + '/search?type=guilds')
    }

    onLoginSuccessful(user) {
      document.getElementById('user-guilds').innerHTML = this._mainWindow._controller.buildGuildsViewList();
    }

    loggedOut() {
      document.getElementById('user-guilds').innerHTML = '';
    }

    loadUserGuildByTarget(event) {
      let node = event.target
      let guildAttr = node.getAttribute("guildid")
      while (guildAttr === null && node) {
        node = node.parentNode
        if (!node)
          break
          guildAttr = node.getAttribute("guildid")
      }
      if (guildAttr !== null) {
        this._controller.loadGuildById(guildAttr)
      }
    }
  };

  return GuildsView;
});