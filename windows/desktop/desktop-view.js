define(function () {
    return function (BaseAppView, WindowNames, WindowsService) {
         
function printDuration(duration){
	duration = Math.floor(duration / 1000)
	var result = ''
	var hours = Math.floor(duration / 3600)
	var minutes = Math.floor((duration % 3600) / 60)
	var seconds = duration % 60
	var putZeroInMinutes = false
	if (hours > 0) {
		putZeroInMinutes = true
		result += hours + ":"
	}
	result += (putZeroInMinutes && minutes < 10 ? "0" : '') + minutes + ":" + (seconds < 10 ? "0" : '') + seconds
	return result
}

function printDate(time)
{	
	var date = new Date(time)
	return date.toLocaleString()
}

function shortenPathString(pathString) {
    return pathString.split('\\').pop().split('/').pop();
  }

function optionHovered(collectedScannedRaids, evt) {
	var raid = collectedScannedRaids[evt.target.value]
	var details = document.getElementById('fight-details')
	var result = "<b>" + htmlEntities(raid.name) + "</b><br>"
	result += "<b>" + this._mainWindow.lang.trans("date_label") + "</b> " + printDate(raid.start) + "<br>"
	result += "<b>" + this._mainWindow.lang.trans("duration_label") + "</b> " + printDuration(raid.end - raid.start) + "<br>"
	
	result += "<b>" + this._mainWindow.lang.trans("friendlies_label") + "</b> "
	for (var i = 0; i < raid.friendlies.length; ++i) {
		if (i > 0)
			result += ", "
		result += htmlEntities(raid.friendlies[i])
	}
	result += "<br>"
	result += "<b>" + this._mainWindow.lang.trans("enemies_label") + "</b> "
	for (var i = 0; i < raid.enemies.length; ++i) {
		if (i > 0)
			result += ", "
		result += htmlEntities(raid.enemies[i])
	}
	result += "<br>"
	details.innerHTML = result
}

function htmlEntities(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function optionUnhovered(evt)
{
	var details = document.getElementById('fight-details')
	details.innerHTML = this._mainWindow.lang.trans("fight_details")
}

function createBrowserWindow(url, size, title, webPreferences) {
  const remote = require('electron').remote;
  const BrowserWindow = remote.BrowserWindow;
  let win = new BrowserWindow({
    ...size,
    icon: path.join(__dirname, './img/warcraft/header-logo.png'),
    title: `${this._mainWindow.game.appTitle()} ${title}`,
    webPreferences,
  });

  win.setMenu(null)
  win.loadURL(url);
}

  class DesktopView extends BaseAppView {
    constructor(mainWindow) {
      super()
      this._mainWindow = mainWindow;
      this._currentPage = "first";
      this._mainWindow.currentPage = this._mainWindow.currentPage || this._currentPage;
      this._reportUIMode = "upload";
      this._mainWindow.reportUIMode = this._mainWindow.reportUIMode ||  this._reportUIMode;

      this._user = {};
  
      if (!window.inGame)
        this._mainWindow.game.desktopContentLoaded?.(document);

      this._selectedVersion = this._mainWindow.storage.version();
      this._selectedLanguage = this._mainWindow.lang.language();

      this._selectedTeam = 0

      // FIXME: Should factor all this Overwolf and Electron code out of this file.
      if (!window.inGame) {
        document.getElementById('home-link').addEventListener('click', this.homeButtonClicked.bind(this));
        if (window.overwolf)
          document.getElementById('website-link').href = this._mainWindow.game.origin();
        else {
          document.getElementById('website-link').addEventListener('click', (event) => {
            event.preventDefault();
            require("electron").shell.openExternal(this._mainWindow.game.origin());
          });
        }
        document.getElementById('character-viewer-link').addEventListener('click', this.characterViewerButtonClicked.bind(this));
        document.getElementById('help-link').href = this._mainWindow.game.scheme() + "://" + this._mainWindow.game.host() + "/companion/help";
      } else {
        document.getElementById('help-link').addEventListener('click', (event) => {
          event.preventDefault();
          overwolf.utils.openUrlInOverwolfBrowser(this._mainWindow.game.scheme() + "://" + this._mainWindow.game.host() + "/companion/help");
        });
      }

      document.getElementById('upload-log-button').addEventListener('click', this.uploadLogButtonClicked.bind(this));
      document.getElementById('live-log-button').addEventListener('click', this.liveLogButtonClicked.bind(this));
      document.getElementById('split-log-button').addEventListener('click', this.splitLogButtonClicked.bind(this));

      document.getElementById('settings-link').addEventListener('click', this.settingsButtonClicked.bind(this));
      document.getElementById('logout-link').addEventListener('click', this.logOutButtonClicked.bind(this));

      if (!window.overwolf) {
        $('#character-viewer-link').remove();
        $('#settings-link').remove(); // Maybe bring back if we get wipe calling working.
        $('#help-link').remove(); // Remove until we do an actual Electron help page.
      }

      document.getElementById('login-form').addEventListener('submit', this.loginFormSubmitted.bind(this));

      document.getElementById('forgot-password-link').href = this._mainWindow.game.scheme() + "://" + this._mainWindow.game.host() + "/password/reset/";
      document.getElementById('register-link').href = this._mainWindow.game.scheme() + "://" + this._mainWindow.game.host() + "/register";
      
      document.getElementById('versions-container').addEventListener('click', this.selectVersionByTarget.bind(this));
     
      document.getElementById('language-submenu').addEventListener('click', this.selectLanguageByTarget.bind(this), true);
     
      document.getElementById('file-chooser').addEventListener('click', this.browseForFile.bind(this));
      document.getElementById('directory-chooser').addEventListener('click', this.browseForLiveLogLocation.bind(this));

      document.getElementById('privacy-contents').addEventListener('click', this.selectPrivacyByTarget.bind(this));
  
      document.getElementById('guilds-teams-and-regions-container').addEventListener('click', this.selectGuildOrRegionByTarget.bind(this));
      
      document.getElementById('upload-button').addEventListener('click', this.goButtonClicked.bind(this));
      document.getElementById('cancelbutton').addEventListener('click', async () => { await this.cancelButtonClicked.bind(this)() });

      document.getElementById('endlivelogbutton').addEventListener('click', async() => { await this.stopLiveLoggingSession.bind(this)() });
      document.getElementById('viewlivelogbutton').addEventListener('click', this.viewLog.bind(this));
      document.getElementById('viewlogbutton').addEventListener('click', this.viewLog.bind(this));
      if (window.inGame) {
        document.getElementById('viewlivelogingamebutton').addEventListener('click', this.viewLogInGame.bind(this));
        document.getElementById('viewlogingamebutton').addEventListener('click', this.viewLogInGame.bind(this));
      }

      document.getElementById('deletelogbutton').addEventListener('click', this.deleteLogFile.bind(this));
      document.getElementById('archivelogbutton').addEventListener('click', this.archiveLogFile.bind(this));
      document.getElementById('donebutton').addEventListener('click', this.homeButtonClicked.bind(this));
      document.getElementById('confirm-deletion-button').addEventListener('click', this.confirmDeletion.bind(this));
      document.getElementById('cancel-deletion-button').addEventListener('click', this.cancelDeletion.bind(this));
      document.getElementById('confirm-archival-button').addEventListener('click', this.confirmArchival.bind(this));
      document.getElementById('cancel-archival-button').addEventListener('click', this.cancelArchival.bind(this));
      this._deletionArchivalUIOptions = document.getElementById('deletion-archival-ui-options');
      this._deletionArchivalUIOptionsDescription = document.getElementById('deletion-archival-ui-options-description');
      this._deletionArchivalUIDeletionOptions = document.getElementById('deletion-archival-ui-deletion-options');
      this._deletionArchivalUIArchivalOptions = document.getElementById('deletion-archival-ui-archival-options');
      this._deletionArchivalUIDeletionSuccessMessage = document.getElementById('deletion-archival-ui-deletion-success-message');
      this._deletionArchivalUIArchivalSuccessMessage = document.getElementById('deletion-archival-ui-archival-success-message');

      if (!window.inGame) {
        document.getElementById('fights-button').addEventListener('click', this.fightsButtonClicked.bind(this));
        document.getElementById('include-trash').addEventListener('click', this.includeTrashChanged.bind(this));
      }

      const multipleVersions = Object.keys(this._mainWindow.game.versions()).length > 1;
      if (!multipleVersions) {
        document.getElementById('versions-container').style.visibility = 'hidden';
      }

      window.updateProgress = this.updateProgress;

      this.createReportMeta = this.createReportMeta.bind(this)
      this.rebuildFights = this.rebuildFights.bind(this)
      this.fightsButtonClicked = this.fightsButtonClicked.bind(this)
      this.browseForFile = this.browseForFile.bind(this)
      this.displayReportUI = this.displayReportUI.bind(this)
    }

    updateProgress(percent, bar) {
      const el = document.getElementById(bar)
      if (!el)
        return

      var barInterior = el.firstChild;
      if (barInterior)
        barInterior.style.width = percent + '%';

      var barNumber = document.getElementById(bar + "-number")
      if (barNumber)
        barNumber.innerHTML = "(" + percent + "%)"
    }

    setUploadProgressContainer(visible) {
      var container = document.getElementById('upload-progress-container')
      if (!container) {
        return
      }
      if (visible)
        container.style.visibility = ''
      else
        container.style.visibility = 'hidden'
    }

    onLoginFailed(error) {
      this.resetLoginButton();
      this._mainWindow.setErrorText(error);
    }
    
    async onLoginSuccessful(user) {
      this.resetLoginButton();

      this._guildHTML = this._mainWindow._controller.buildGuildListFromJSON();

      await this.displayReportUI();

      if (user.regions.length === 1) {
        this.selectRegion(user.regions[0].id, true);
      }

      const regionHasAlreadyBeenSaved = this._mainWindow.storage.getVersionedStoredItem('region') !== null;
      if (!regionHasAlreadyBeenSaved && user.preferredRegion) {
        this.selectRegion(user.preferredRegion.id, true);
      }

      this._user = user;
    }

    setLastReportCode(reportCode) {
      this._mainWindow.lastReportCode = reportCode
    }

    async selectReportPage(page, onlyUpdateInGameWindow) {
      document.getElementById('report-' + this._currentPage + "-page").style.display = 'none';
      document.getElementById('report-' + page + "-page").style.display = 'block';

      if (window.inGame) {
        if (page === 'upload') this._mainWindow.setLiveLogStatus('stopped');
        if (page === 'progress' && this._reportUIMode === 'livelog') this._mainWindow.setLiveLogStatus('started');
      }

      this._currentPage = page;
      if (!window.inGame || !onlyUpdateInGameWindow)
        this._mainWindow.currentPage = page;

      if (window.inGame && page === 'first')
        await this.liveLogButtonClicked(null, true);

      document.getElementById('upload-button').disabled = false;
    }

    async setReportUIElementsVisibility(mode, visible, doNotUpdateFileBrowsers) {
      if (mode == "upload") {
        if (!doNotUpdateFileBrowsers) {
          this.updateFileChooserUI("logfile", await this._mainWindow.getFileUploadName());
          this.updateFileChooserUI("directory", this._mainWindow.storage.getVersionedStoredItem("directory") || '');
        }

        if (visible) {
          document.getElementById('file-chooser-description').style.display = ''
          document.getElementById('file-chooser-row').style.display = ''
          document.getElementById('fight-chooser-container').style.display = ''
          document.getElementById('logfile-progress-container').style.display = ''
          document.getElementById('guild-chooser-description').style.display = ''
          document.getElementById('guilds-and-privacy-menu').style.display = ''
          document.getElementById('view-report-description').style.display = ''
          document.getElementById('view-report-container').style.display = ''
          document.getElementById('description-container').style.display = ''
        } else {
          document.getElementById('file-chooser-description').style.display = 'none'
          document.getElementById('file-chooser-row').style.display = 'none'
          document.getElementById('fight-chooser-container').style.display = 'none'
          document.getElementById('logfile-progress-container').style.display = 'none'
          document.getElementById('guild-chooser-description').style.display = 'none'
          document.getElementById('guilds-and-privacy-menu').style.display = 'none'
          document.getElementById('view-report-description').style.display = 'none'
          document.getElementById('view-report-container').style.display = 'none'
          document.getElementById('description-container').style.display = 'none'
        }
      } else if (mode == "livelog") {
        if (visible) {
          document.getElementById('directory-chooser-description').style.display = ''
          document.getElementById('directory-chooser-row').style.display = ''
          document.getElementById('livelog-progress-status').style.display = ''
          document.getElementById('endlivelogbutton').style.display = ''
          document.getElementById('viewlivelogbutton').style.display = ''
          if (document.getElementById('viewlivelogingamebutton'))
            document.getElementById('viewlivelogingamebutton').style.display = ''
          document.getElementById('guild-chooser-description').style.display = ''
          document.getElementById('guilds-and-privacy-menu').style.display = ''
          document.getElementById('view-report-description').style.display = ''
          document.getElementById('view-report-container').style.display = ''
          document.getElementById('description-container').style.display = ''
          document.getElementById('livelog-entirefile-container').style.display = game.liveLoggingMustIncludeEntireFile() ? '' : 'none'
        } else {
          document.getElementById('directory-chooser-description').style.display = 'none'
          document.getElementById('directory-chooser-row').style.display = 'none'
          document.getElementById('livelog-progress-status').style.display = 'none'
          document.getElementById('endlivelogbutton').style.display = 'none'
          document.getElementById('viewlivelogbutton').style.display = 'none'
          if (document.getElementById('viewlivelogingamebutton'))
            document.getElementById('viewlivelogingamebutton').style.display = 'none'
          document.getElementById('guild-chooser-description').style.display = 'none'
          document.getElementById('guilds-and-privacy-menu').style.display = 'none'
          document.getElementById('view-report-description').style.display = 'none'
          document.getElementById('view-report-container').style.display = 'none'
          document.getElementById('description-container').style.display = 'none'
          document.getElementById('livelog-entirefile-container').style.display = 'none'
        }
      } else if (mode == "split") {
        if (visible) {
          this.setUploadProgressContainer(false)
          document.getElementById('split-file-chooser-description').style.display = ''
          document.getElementById('file-chooser-row').style.display = ''
          document.getElementById('logfile-progress-container').style.display = ''
          document.getElementById('description-container').style.display = 'none'
        } else {
          document.getElementById('split-file-chooser-description').style.display = 'none'
          document.getElementById('file-chooser-row').style.display = 'none'
          document.getElementById('logfile-progress-container').style.display = 'none'
          document.getElementById('description-container').style.display = ''
        }
      }
    }

    async setReportUIMode(mode, doNotUpdateFileBrowsers, onlyUpdateInGameWindow) {
      await this.setReportUIElementsVisibility(this._reportUIMode, false, doNotUpdateFileBrowsers);

      this._reportUIMode = mode;

      if (!window.inGame || !onlyUpdateInGameWindow)
        this._mainWindow.reportUIMode = mode;

      await this.setReportUIElementsVisibility(mode, true, doNotUpdateFileBrowsers);

      $('#guilds-and-privacy-menu').smartmenus("refresh");
    }

    buildGuilds() {
      document.getElementById('guilds-teams-and-regions-container').innerHTML = this._guildHTML;

      let guildID = !!this._mainWindow.guildID ? parseInt(this._mainWindow.guildID) : 0;
      let teamID = !!this._mainWindow.teamID ? parseInt(this._mainWindow.teamID) : 0;
      this.selectGuild(guildID);
      this.selectTeam(teamID);
    }

    selectPrivacy(setting) {
      let privacyElt = document.getElementById('privacy-' + setting);
      if (privacyElt)
        $("#privacy-selection-text").html(privacyElt.firstChild.nextSibling.textContent)
      this._selectedPrivacy = setting;
    }

    selectRegion(regionID, persistRegion) {
      $("#regions-selection-text").html($('#region-' + regionID).html())

      this._selectedRegion = regionID

      if (persistRegion)
        this._mainWindow.setRegion(regionID);
    }

    selectTeam(teamID) {
      if (this._selectedGuild == 0)
        return

      $("#teams-" + this._selectedGuild + " .team-selection-text").html($('#teams-' + this._selectedGuild + '-' + teamID).html())
   
      this._mainWindow.storage.setVersionedStoredItem('team', teamID);

      this._selectedTeam = teamID
    }

    selectGuild(guildID) {
      if (this._selectedGuild !== undefined) {
       
        // Hide that guild's raid teams.
        if (this._selectedGuild > 0) {
          document.getElementById('teams-' + this._selectedGuild).style.display = 'none'
          this.selectTeam(0)
        }
      }
      
      if (document.getElementById('guild-' + guildID)) {
        document.getElementById('guild-selection-text').innerHTML = document.getElementById('guild-' + guildID).innerHTML
        this._mainWindow.storage.setVersionedStoredItem('guild', guildID)
        this._selectedGuild = guildID
      }


      if (this._selectedGuild === 0 && document.getElementById('regions')) {
        document.getElementById('regions').style.display = ''
       }  else {
         if (document.getElementById('regions')) {
           document.getElementById('regions').style.display = 'none'

         }
        
         if ( document.getElementById('teams-' + this._selectedGuild)) {
           // Show this guild's teams.
           document.getElementById('teams-' + this._selectedGuild).style.display = ''
         }

        this.selectTeam(0)
      } 
    }

    async finalizeGuild() {
      await this.selectReportPage('upload')
    }

    selectGuildOrRegionByTarget(event) {
      var node = event.target
      var guildAttr = node.getAttribute("guildid")
      var regionAttr = node.getAttribute("regionid")
      var teamAttr = node.getAttribute('teamid')
      while (guildAttr === null && regionAttr === null && teamAttr === null && node) {
        node = node.parentNode
        if (!node)
          break;
        guildAttr = node.getAttribute("guildid")
        regionAttr = node.getAttribute("regionid")
        teamAttr = node.getAttribute('teamid')
      }
      if (guildAttr !== null)
        this.selectGuild(parseInt(guildAttr))
      else if (regionAttr !== null)
        this.selectRegion(parseInt(regionAttr), true)
      else if (teamAttr !== null)
        this.selectTeam(parseInt(teamAttr))

      $('#guilds-and-privacy-menu').smartmenus("refresh");
    }

    setFileDisplay(str, id) {
      if (!str)
        str = ''

      if (str.length > 70)
        str = str.substr(0, 10) + '...' + str.substr(str.length - 50, str.length);

      document.getElementById(id).innerText = str;
    }

    async displayReportUI() {
      await this.selectReportPage('first');
      
      document.getElementById('startup-panel').style.display = 'none';
      document.getElementById('logout-link').style.display = 'block';
      document.getElementById('logincontent').style.display = 'none';
      document.getElementById('reportcontent').style.display = 'block';

      this.buildGuilds();

      let visibility = this._mainWindow.defaultReportVisibility != '' ? parseInt(this._mainWindow.defaultReportVisibility) : 0;
      this.selectPrivacy(visibility);
      
      if (!!this._mainWindow.chooseFightsToUpload)
        document.getElementById('fight-chooser').checked = (this._mainWindow.chooseFightsToUpload == '1');

      if (!!this._mainWindow.includeTrashFights)
        document.getElementById('include-trash').checked = (this._mainWindow.includeTrashFights == '1');

      if (!!this._mainWindow.liveLogEntireFile)
        document.getElementById('livelog-entirefile-chooser').checked = (this._mainWindow.liveLogEntireFile == '1');

      if (!!this._mainWindow.directoryUploadName) {
        document.getElementById('directory').innerText = this._mainWindow.directoryUploadName;
        this.setFileDisplay(this._mainWindow.directoryUploadName, 'directory-display');
      }

      await this.resetFileUploadName();

      let regionID = this._mainWindow.getRegion();
      if (regionID > 0 && !this._mainWindow.game.defaultRegion())
        this.selectRegion(regionID, false)

      if (window.inGame)
        await this.liveLogButtonClicked(null, true);
    }

    setProgressStatusText(text, id) {
      this._mainWindow.progressStatusText = text;
      this._mainWindow.progressStatusTextElementId = id;

      document.getElementById(id).innerHTML = text;
    }

    setErrorText(text) {
      this._mainWindow.errorText = text;
      document.getElementById('upload-button').disabled = false;

      let errorBlock = document.getElementById('errorblock');
      if (text == '')
        errorBlock.style.display = 'none';
      else
        errorBlock.style.display = 'block';

      document.getElementById('errortext').innerHTML = text;
      document.body.offsetWidth;

      if (window.inGame && text !== '' && this._reportUIMode === 'livelog') {
        this._mainWindow.setLiveLogStatus('error');
      }
    }

    setWarningText(text) {
      this._mainWindow.warningText = text;

      let errorBlock = document.getElementById('warningblock');
      if (text == '')
        errorBlock.style.display = 'none';
      else
        errorBlock.style.display = 'block';

      document.getElementById('warningtext').innerHTML = text;
      document.body.offsetWidth;

      if (window.inGame && text !== '' && this._reportUIMode === 'livelog') {
        this._mainWindow.setLiveLogStatus('warning');
      }
    }

    async showFightSelectionUI(collectedScannedRaids, logVersion) {
      await this.selectReportPage('fights')
      this.collectedScannedRaids = collectedScannedRaids
      this.logVersion = logVersion
      this.rebuildFights()
    }

    includeTrashChanged() {
      this.rebuildFights()
    }

    rebuildFights() {
      const { logVersion, collectedScannedRaids } = this
      const game = this._mainWindow.game
      const fightList = document.getElementById('fights-list')
      fightList.innerHTML = ''
      const includeTrash = document.getElementById('include-trash').checked
      this._mainWindow.setIncludeTrashFights(includeTrash)
      for (let i = 0; i < collectedScannedRaids.length; ++i) {
        if (!includeTrash && collectedScannedRaids[i].boss == 0)
          continue
        const option = document.createElement("option")
        option.value = i
        option.onmouseover = optionHovered.bind(this, collectedScannedRaids)
        option.onmouseout = optionUnhovered.bind(this)
        let name = collectedScannedRaids[i].name
        if (collectedScannedRaids[i].boss > 0) {
          name += " " + game.nameForDifficulty(collectedScannedRaids[i].difficulty, logVersion)
          option.setAttribute('class', 'Boss')
          if (game.separatesWipesAndKills()) {
            if (!collectedScannedRaids[i].success)
              name += " " + this._mainWindow.lang.trans("wipe")
            else
              name += " " + this._mainWindow.lang.trans("kill")
            if (collectedScannedRaids[i].pulls > 1)
              name += "s (" + collectedScannedRaids[i].pulls + ")"
          } else
            name += " (" + collectedScannedRaids[i].pulls + ")"
        } else
          option.setAttribute('class', 'NPC')
        option.text = htmlEntities(name)
        fightList.add(option, null)
      }
    }

    resetUploadButton() {
      document.getElementById('upload-button').innerHTML = this._mainWindow.lang.trans("go_button");

      if (!window.inGame)
        document.getElementById('fights-button').innerHTML = this._mainWindow.lang.trans("go_button");
    }

    setCancelButtonVisible(visible) {
      let cancelButton = document.getElementById('cancelbutton');
      if (!visible)
        cancelButton.style.display = 'none';
      else
        cancelButton.style.display = 'inline-block';
    }

    setStatusText(text, hideSpinny) {
    }

    async cancelOrFinish(reportPage) {
      this.collectedScannedRaids = new Array()
      this.logVersion = 0

      this.resetUploadButton()
      await this.selectReportPage(reportPage)
      this.setStatusText('')
      this.setCancelButtonVisible(false)
    }

    handleLogDeletionAndArchival(fileForDeletionAndArchival) {
      this._mainWindow.doneProcessing()

      document.getElementById("deletion-archival-ui").style.display = 'none'

      if (fileForDeletionAndArchival) {
        const fileName = shortenPathString(fileForDeletionAndArchival)
        this.fileForDeletionAndArchival = fileForDeletionAndArchival
        document.getElementById("deletion-archival-ui").style.display = ''
        document.getElementById("deletelogbutton").innerHTML = "Delete " + fileName
        document.getElementById("archivelogbutton").innerHTML = "Archive " + fileName

        this._deletionArchivalUIDeletionOptions.style.display = 'none';
        this._deletionArchivalUIArchivalOptions.style.display = 'none';
        this._deletionArchivalUIDeletionSuccessMessage.style.display = 'none';
        this._deletionArchivalUIArchivalSuccessMessage.style.display = 'none';
        this._deletionArchivalUIOptions.style.display = 'block';
        this._deletionArchivalUIOptionsDescription.innerText = this._mainWindow.lang.trans('delete_or_archive_desc');
      } else {
        this._mainWindow.goHome();
      }
    }

    fillInLoginForm() {
      document.getElementById('startup-panel').style.display = 'none'
      document.getElementById('logincontent').style.display = 'block'
      document.getElementById('email').value = this._mainWindow.userName
  
      if (!this._mainWindow.userName) {
        document.getElementById('email').focus()
        document.getElementById('email').select()
      } else
        document.getElementById('password').focus()
    }

    resetLoginButton() {
      document.getElementById('login-button').innerHTML = this._mainWindow.lang.trans("login")
    }

    loggedOut() {
      document.getElementById('logout-link').style.display = 'none';
      document.getElementById('logincontent').style.display = 'block';
      document.getElementById('reportcontent').style.display = 'none';
      this.fillInLoginForm();

      this._user = {};
    }

    homeButtonClicked(evt) {
      evt.preventDefault();
      this._mainWindow.goHome();
    }

    async characterViewerButtonClicked(evt) {
      evt.preventDefault();
      if ('undefined' !== typeof overwolf) {
        await WindowsService.minimizeIfOpen(WindowNames.CHARACTERS_IN_GAME);
        await WindowsService.restore(WindowNames.CHARACTERS);
        let wasCentered = localStorage.getItem("wasCentered-" + WindowNames.CHARACTERS);
        if (!wasCentered) {
          await WindowsService.changePositionCenter(WindowNames.CHARACTERS);
          localStorage.setItem("wasCentered-" + WindowNames.CHARACTERS, true);
        }
        return
      }

      

      createBrowserWindow(
        `file://${__dirname}/characters/characters.html?isLoggedIn=${window.isLoggedIn}&guildsAndCharacters=${JSON.stringify(window.guildsAndCharacters)}`,
        {
          height: 900,
          width: 1800,
        },
        "Character Viewer",
        {
          webviewTag: true,
          nodeIntegration: true,
          preload: path.join(__dirname, './character-guild-preload.js'),
        }
      )
    }

    async guildViewerButtonClicked(evt) {
      evt.preventDefault();
      if ('undefined' !== typeof overwolf) {
        await WindowsService.restore(WindowNames.GUILDS);
        return
      }

      createBrowserWindow(
        `file://${__dirname}/guilds/guilds.html?isLoggedIn=${window.isLoggedIn}&guildsAndCharacters=${JSON.stringify(window.guildsAndCharacters)}`,
        {
          height: 900,
          width: 1800,
        },
        "Guilds Viewer",
        {
          webviewTag: true,
          nodeIntegration: true,
          preload: path.join(__dirname, './character-guild-preload.js'),
        }
      )
    }

    async reportViewerButtonClicked(evt) {
      evt.preventDefault();
      if ('undefined' !== typeof overwolf) {
        await WindowsService.restore(WindowNames.REPORTS);
        return
      }

      createBrowserWindow(
        `file://${__dirname}/reports/reports.html?isLoggedIn=${window.isLoggedIn}`,
        {
          height: 900,
          width: 1800,
        },
        "Reports",
        {
          webviewTag: true,
          nodeIntegration: true,
          preload:  path.join(__dirname, './report-preload.js'),
        }
      )
    }

    async liveLogButtonClicked(evt, onlyUpdateInGameWindow) {
      await this.setReportUIMode('livelog', undefined, onlyUpdateInGameWindow);
      await this.selectReportPage('upload', onlyUpdateInGameWindow);
    }

    async uploadLogButtonClicked(evt) {
      await this.setReportUIMode('upload');
      await this.selectReportPage('upload');
    }

    async splitLogButtonClicked(evt) {
      await this.setReportUIMode('split');
      await this.selectReportPage('upload');
    }

    settingsButtonClicked() {
      if ($('.settings').length || !window.overwolf)
        return;

      window.overwolf.settings.getExtensionSettings(result => {
        if (!result.success)
          return;

        const settings = {...result.settings};

        const settingsElement = $(`
<div class="settings">
  <div class="settings__options">
    <a href="overwolf://settings/games-overlay?gameId=${this._mainWindow.game.currentOverwolfGameId()}&hotkey=unknown">
      <button name="change-hotkeys">${this._mainWindow.lang.trans('change_hotkeys')}</button>
    </a>
    <label for="change-hotkeys">${this._mainWindow.lang.trans('change_hotkeys_description')}</label>
    <a href="overwolf://settings/games-overlay?gameId=${this._mainWindow.game.currentOverwolfGameId()}&hotkey=unknown">
      <button name="auto-launch">${this._mainWindow.lang.trans('change_auto_launch')}</button>
    </a>
    <span>${this._mainWindow.lang.trans('change_auto_launch_description')}</span>
    <div class="settings__close-overwolf-control">
      <input type="checkbox" name="close-overwolf" ${settings.exit_overwolf_on_exit ? 'checked' : ''} />
      <label for="close-overwolf"></label>
    </div>
    <span>${this._mainWindow.lang.trans('close_overwolf_description')}</span>
  </div>
  <div>
    <button class="big-button settings__done-button">${this._mainWindow.lang.trans('done_button')}</button>
  </div>
</div>`);

        $('body').append(settingsElement);

        const closeOverwolfControlElement = $('.settings__close-overwolf-control');
        closeOverwolfControlElement.on('click', () => {
          settings.exit_overwolf_on_exit = !settings.exit_overwolf_on_exit;

          window.overwolf.settings.setExtensionSettings({...settings}, result => {
            if (!result.success) {
              console.error(result);
              return;
            }

            if (settings.exit_overwolf_on_exit) {
              closeOverwolfControlElement.find('input').attr('checked', true);
            } else {
              closeOverwolfControlElement.find('input').removeAttr('checked');
            }
          });
        });

        $('.settings__done-button').on('click', () => {
          settingsElement.remove();
        });
      });
    }

    logOutButtonClicked(evt) {
      this._mainWindow.logOut();
      evt.preventDefault();
    }

    loginFormSubmitted(evt) {
      this._mainWindow.setErrorText('');

      evt.stopPropagation();
      evt.preventDefault();

      let email = document.getElementById('email').value;
      let password = document.getElementById('password').value;
      if (email == '' || password == '') {
        this._mainWindow.setErrorText(this._mainWindow.lang.trans("missing_user_or_password"))
        return
      }

      let spinnyPath = document.getElementById('button-spinny').src
      document.getElementById('login-button').innerHTML = '<img id="button-spinny" src="' + spinnyPath + '">';
      this._mainWindow.logIn(email, password);
    }

    selectVersion(versionID) {
      if (this._selectedVersion != '')
        document.getElementById('version-' + this._selectedVersion).removeAttribute("selected")

      document.getElementById('version-' + versionID).setAttribute("selected", true)

      this._selectedVersion = versionID
    }

    selectVersionByTarget(event) {
      var node = event.target
      var versionAttr = node.getAttribute("versionid")
      while (versionAttr === null && node) {
        node = node.parentNode
        versionAttr = node.getAttribute("versionid")
      }
      if (versionAttr !== null) {
        this.selectVersion(versionAttr);
        this._mainWindow.setVersion(this._selectedVersion);
      }
    }

    selectLanguage(languageID) {
      this._selectedLanguage = languageID
    }

    selectLanguageByTarget(event) {
      var node = event.target
      var languageAttr = node ? node.getAttribute("languageid") : null
      while (languageAttr === null && node) {
        node = node.parentNode
        languageAttr = node ? node.getAttribute("languageid") : null
      }
      if (languageAttr !== null) {
        this.selectLanguage(languageAttr);
        this._mainWindow.setLanguage(this._selectedLanguage);
      }
    }

    selectPrivacyByTarget(event) {
      var node = event.target
      var privacyAttr = node.getAttribute("privacyid")
      while (privacyAttr === null && node) {
        node = node.parentNode
        if (!node)
          break
        privacyAttr = node.getAttribute("privacyid")
      }
      if (privacyAttr !== null) {
        this.selectPrivacy(privacyAttr)
        this._mainWindow.defaultReportVisibility = this._selectedPrivacy
        this._mainWindow.storage.setVersionedStoredItem("visibility", this._selectedPrivacy);
      }
    }

    async showSelectGuildUI() {
      this._mainWindow.setErrorText('')
      await this.selectReportPage('guild')
    }

    _overwolfUriToPath(uri) {
      if (!uri.startsWith('overwolf'))
        return uri;

      let rest = decodeURI(uri.substring(14));
      let firstSlash = rest.indexOf('/');
      let driveLetter = rest.substring(0, firstSlash);
      let path = rest.substring(firstSlash + 1);

      path = driveLetter + ":\\" + path
      path = path.replace(/\//g, '\\');

      return path
    }

    async setLogDirectory(directoryUploadName, updateFileInputs) {
      if (updateFileInputs)
        await this.resetFileUploadName();

      this.updateFileChooserUI('directory', directoryUploadName);
    }

    async resetFileUploadName() {
      const fileUploadName = await this._mainWindow.getFileUploadName();
      if (!!fileUploadName) {
        document.getElementById('logfile').innerText = fileUploadName;
        this.setFileDisplay(fileUploadName, 'logfile-display');
      }
    }

    async liveLogLocationSelected(data) {
      if ((data.status != "success" || !data.path) && !data.filePaths)
        return;
      const path = data.path || data.filePaths[0]
      this._mainWindow.setLogDirectory(path, true);
    }

    overwolfFileSelected(data) {
      if (data.status != "success" || !data.url)
        return;

      if (data.file) {
        this.fileSelected(data.file, "logfile");
        return;
      }

      this.fileSelected(this._overwolfUriToPath(data.url), "logfile");
    }

    fileSelected(fileName, id)
    {
      let directory = fileName.match(/(.*)[\/\\]/)[1]||'';
      this._mainWindow.setLogDirectory(directory, false);
      this.updateFileChooserUI(id, fileName);
    }

    updateFileChooserUI(id, fileName) {
      document.getElementById(id).innerText = fileName
      this.setFileDisplay(fileName, id + '-display')
    }

    browseForLiveLogLocation() {
      let fileName = this._mainWindow.storage.getVersionedStoredItem("directory") || 'C:/';
      if ('undefined' !== typeof overwolf) {
        overwolf.utils.openFolderPicker(fileName, this.liveLogLocationSelected.bind(this));
        return
      }

      dialog.showOpenDialog({ properties: ['openDirectory' ]}).then((data) => this.liveLogLocationSelected(data));
    }

    async browseForFile() {
      let fileName = await this._mainWindow.getFileUploadName();
      let path;
      if (!fileName) {
        path = this._mainWindow.storage.getVersionedStoredItem("directory") || '';
      } else {
        let lastSlashIndex = Math.max(fileName.lastIndexOf('\\'), fileName.lastIndexOf('/'))
        path = lastSlashIndex != -1 ? fileName.substring(0, lastSlashIndex) : null
      }

      if (window.overwolf) {
        overwolf.utils.openFilePicker("." + this._mainWindow.game.logFileExtension(), path, this.overwolfFileSelected.bind(this))
        return 
      }
      
      const electronFileSelected = (data) => {
        if (!data || !data.filePaths[0])
          return
        const filePath = data.filePaths[0]
        this.fileSelected(filePath, "logfile")
      }

      if (dialog) {
        dialog.showOpenDialog({
            defaultPath: path, properties: ['openFile' ], filters: [{ name: 'Log Files', extensions: [ game.logFileExtension() ] }]
        }).then((data) => electronFileSelected(data))
      } 
    }

    scanLogFileForRaids(reportMeta, file) {
      this._mainWindow.scanLogFileForRaids(reportMeta, file);
    }

    processLogFile(reportMeta, file, raidsToUpload) {
      this._mainWindow.processLogFile(reportMeta, file, raidsToUpload);
    }

    startLiveLoggingSession(reportMeta, dir) {
      this._mainWindow.startLiveLoggingSession(reportMeta, dir);
    }

    splitLogFile(dir) {
      this._mainWindow.splitLogFile(dir);
    }

    async cancelButtonClicked() {
      await this._mainWindow.cancelUploadOrLiveLog();
      await this._mainWindow.cancelOrFinish('upload');
    }

    async stopLiveLoggingSession() {
      await this._mainWindow.stopLiveLoggingSession();
    }

    viewLog(e) {
      e.preventDefault()
      const scheme = this._mainWindow.game.scheme()
      const host = this._mainWindow.game.host()
      const url = scheme + "://" + host + "/reports/" + this._mainWindow.lastReportCode + "/"
      if (window.overwolf) {
        window.open(url)
        return 
      }
      require("electron").shell.openExternal(url)
    }

    viewLogInGame() {
      this._mainWindow.viewLogInGame(this._mainWindow.lastReportCode, 'last');
    }

    createReportMeta() {
      const startTime = new Date().getTime();
      const descToUse = this.liveLoggingAutoStartDescription ? this.liveLoggingAutoStartDescription : document.getElementById('description').value
      if (this.liveLoggingAutoStartDescription)
        this.liveLoggingAutoStartDescription = null
      const reportMeta = {
        description: descToUse,
        selectedGuild: this._selectedGuild,
        selectedTeam: this._selectedTeam,
        selectedRegion: this._selectedRegion,
        selectedPrivacy: this._selectedPrivacy,
        startTime,
        clientVersion: this._mainWindow._internalVersion
      }

      return reportMeta
    }

    goButtonClicked() {
      this._mainWindow.setErrorText('');
      this._mainWindow.setWarningText('');

      document.getElementById('upload-button').disabled = true;

      if (this._mainWindow._uploader) {
        this._mainWindow.setErrorText(this._mainWindow.lang.trans('operation_in_progress'));
        return;
      }
      const reportMeta = this.createReportMeta()

      this._mainWindow.setReportUIMode(this._reportUIMode, true);
      if (this._reportUIMode == "upload") {
        const scanForFights = document.getElementById('fight-chooser').checked
        this._mainWindow.setChooseFightsToUpload(scanForFights)
        if (scanForFights)
          this.scanLogFileForRaids(
            reportMeta,
            document.getElementById('logfile').innerText
          )
        else {
          this.processLogFile(
            reportMeta,
            document.getElementById('logfile').innerText)
        }
      } else if (this._reportUIMode == "livelog") {
        const liveLogEntireFile = document.getElementById('livelog-entirefile-chooser').checked
        this._mainWindow.setLiveLogEntireFile(liveLogEntireFile)
        this.startLiveLoggingSession(
            reportMeta,
            document.getElementById('directory').innerText)
      } else if (this._reportUIMode == "split")
        this.splitLogFile(
          document.getElementById('logfile').innerText
        )
    }

    async fightsButtonClicked() {
      this._mainWindow.setErrorText('');
      this._mainWindow.setWarningText('');

      const options = document.getElementById('fights-list').options
      const selectedOptions = new Array()
      for (var i = 0; i < options.length; ++i) {
        if (options[i].selected)
          selectedOptions.push(options[i])
      }
    
      if (selectedOptions.length == 0) {
        this._mainWindow.setErrorText(this._mainWindow.lang.trans("no_fight_selected"))
        return
      }

      const raidsToCheck = this.collectedScannedRaids
      await this._mainWindow.cancelUploadOrLiveLog();
      await this.cancelOrFinish('fights') // This wipes out scannedRaids and clears raidsToUpload.

      const raidsToUpload = new Array()

      for (let i = 0; i < selectedOptions.length; ++i) {
        raidsToUpload.push(raidsToCheck[selectedOptions[i].value])
      }
    
      const reportMeta = this.createReportMeta()


      this.processLogFile(
        reportMeta,
        document.getElementById('logfile').innerText,
        raidsToUpload)
    }

    deleteLogFile() {
      this._deletionArchivalUIOptions.style.display = 'none';
      this._deletionArchivalUIDeletionOptions.style.display = 'block';
    }

    archiveLogFile() {
      this._deletionArchivalUIOptions.style.display = 'none';
      this._deletionArchivalUIArchivalOptions.style.display = 'block';
    }

    confirmDeletion() {
      this._mainWindow.deleteLogFile(this.fileForDeletionAndArchival);
    }

    cancelDeletion() {
      this._deletionArchivalUIOptions.style.display = 'block';
      this._deletionArchivalUIDeletionOptions.style.display = 'none';
    }

    confirmArchival() {
      this._mainWindow.archiveLogFile(this.fileForDeletionAndArchival);
    }

    cancelArchival() {
      this._deletionArchivalUIOptions.style.display = 'block';
      this._deletionArchivalUIArchivalOptions.style.display = 'none';
    }

    showDeletionSucceededMessage() {
      this._deletionArchivalUIDeletionOptions.style.display = 'none';
      this._deletionArchivalUIDeletionSuccessMessage.style.display = 'block';
    }

    showDeletionFailedMessage() {
      this._deletionArchivalUIOptionsDescription.innerText = this._mainWindow.lang.trans('deletion_failed');
      this.cancelDeletion();
    }

    showArchivalSucceededMessage() {
      this._deletionArchivalUIArchivalOptions.style.display = 'none';
      this._deletionArchivalUIArchivalSuccessMessage.style.display = 'block';
    }

    showArchivalFailedMessage() {
      this._deletionArchivalUIOptionsDescription.innerText = this._mainWindow.lang.trans('archival_failure');
      this.cancelArchival();
    }
  }             
    return DesktopView;
}});
