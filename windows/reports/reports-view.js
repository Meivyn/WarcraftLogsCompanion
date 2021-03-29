define([
  '../BaseAppView.js',
  "../../scripts/constants/window-names.js",
  "../../scripts/services/windows-service.js",
  "../../scripts/services/ad-service.js"
], function (BaseAppView, WindowNames, WindowsService, AdService) {

  class ReportsView extends BaseAppView {
    constructor(controller) {
      super();

      this._controller = controller;
      this._adService = new AdService();

      this._haveReports = false;

      this._mainWindow = overwolf.windows.getMainWindow();
      
      this._selectedVersion = this._mainWindow.storage.version();
      this._selectedLanguage = this._mainWindow.lang.language();

      document.getElementById('recent-reports-contents').addEventListener('click', this.loadReportByTarget.bind(this));
      document.getElementById('recent-reports-reload').addEventListener('click', this.reloadButtonClicked.bind(this));
    }

    onLoginSuccessful(user) {
      this._mainWindow.loadRecentReports();
      this._haveReports = true;

      if (user && user.isSubscribed) {
        this._adService.hideAd();
      } else {
        this._adService.showAd();
      }
    }

    reloadButtonClicked(evt)
    {
      if (this._haveReports)
        this._mainWindow.loadRecentReports();
    }
    
    loggedOut() {
      document.getElementById('recent-reports-contents').innerHTML = ''
      document.getElementById('report-frame').src = './blank.html';
      this._haveReports = false;

      this._adService.showAd();
    }

    reportsUpdated(reports) {
      if (!reports || !reports.length)
        return;
      let reportsResult = '';
      for (let i = 0; i < reports.length; ++i) {
        let report = reports[i];
        if (report.guildName == "Snowball")
          continue;
        reportsResult += '<div class="reports-entry" code="' + report.code + '" id="report-' + report.code + '">';
        if (report.guildName)
          reportsResult += ' <span class="reports-guild faction-' + report.guildFaction + '">' + report.guildName + '</span>';

        reportsResult += '<div class="reports-entry-description">' + report.description + '</div>';
        reportsResult += '<div class="reports-entry-details">';
        reportsResult += report.username + ' - (' + this.localizedPrivacy(report.is_private) + ')'
        reportsResult += ' - ' + new Date(report.end_time).toLocaleString()
       
        reportsResult += "</div>"
        reportsResult += '</div>';
      }

      document.getElementById('recent-reports-contents').innerHTML = reportsResult;

      this.selectReport(reports[0].code);
    }

    selectReport(code, fight)
    {
      this._controller.loadReport(code, fight);
      $(".reports-entry").removeClass("selected")
      $("#report-" + code).addClass('selected');
    }

    localizedPrivacy(privacy)
    {
      let lang = this._mainWindow.lang;
      if (privacy == 0)
        return lang.trans('public_report');
      if (privacy == 1)
        return lang.trans('private_report');
      if (privacy = 2)
        return lang.trans('unlisted_report');
      return '';
    }

    loadReportByTarget(event) {
      let node = event.target
      let codeAttr = node.getAttribute("code")
      while (codeAttr === null && node) {
        node = node.parentNode
        if (!node)
          break
        codeAttr = node.getAttribute("code")
      }
      if (codeAttr !== null) {
        this.selectReport(codeAttr)
      }
    }
   
  };

  return ReportsView;
});