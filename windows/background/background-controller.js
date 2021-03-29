/// SET THIS TO TRUE FOR LOCAL SERVER TEST MODE
/// IF TRUE, THE PROD SERVER WILL NOT BE USED
/// INSTEAD A SERVER HTTP://LOCALHOST:3010 SUPPORTING
// POST /post AND GET /report WILL BE USED
const isLocalTestMode = false

define([
  "../../scripts/constants/window-names.js",
  "../../scripts/services/running-game-service.js",
  "../../scripts/services/windows-service.js",
  "../../scripts/services/hotkeys-service.js",
  "../../scripts/services/gep-service.js",
  "../../scripts/services/event-bus.js",
  "../../scripts/warcraft/game.js",
  "../../scripts/services/lang-service.js",
  "../../scripts/services/storage-service.js",
  "../../scripts/services/sanitization-service.js",
  "../../scripts/constants/backend-states.js",
  "../../scripts/core/fs.js",
  "../../scripts/core/ui-delegate.js",
  "../../scripts/core/large-async-file-reader.js",
  "../../scripts/common/report.js",
  "../../scripts/common/chunk-consumer.js",
  "../../scripts/common/uploader-builder.js",
  "../../scripts/core/file.js",
  "../../scripts/core/file-stream.js",
  "../../scripts/3rdparty/overwolfplugin.js",
], function (
  WindowNames,
  runningGameService,
  WindowsService,
  hotkeysService,
  gepService,
  eventBus,
  Game,
  LangService,
  StorageService,
  SanitizationService,
  BackendState,
  FS,
  UIDelegate,
  LargeAsyncFileReader,
  Report,
  ChunkConsumerBuilder,
  UploaderBuilder,
  ZipFile,
  FileStream,
  _,
) {
  const escapedISOString = (date) => {
    const result = date.toISOString()
    const replacedResult = result.replace(/:/g, "-")
    return replacedResult
  }

  const {
    trans,
    setErrorText,
    setWarningText
  } = UIDelegate

   
class BackgroundController {

  static async run() {
      // this will be available when calling overwolf.windows.getMainWindow()
      window._internalVersion = '5.45'
      window._isLocalTestMode = false
      window._splittingLogFile = false
      window._splitFileTimestamp = 0
      window._previousTimestampForSplit = 0
      window._daylightSavingsSplitShift = 0
      window._splitYearSet = false
      window._splitYear = 0
      window._previousSplitTime = 0
      window._controller = this;
      window.loggedIn = BackendState.NOT_LOGGED_IN;
      window.eventBus = eventBus;

      window.setErrorText = BackgroundController.setErrorText;
      window.setWarningText = BackgroundController.setWarningText;
      window.goHome = BackgroundController.goHome;
      window.viewLogInGame = BackgroundController.viewLogInGame;
      window.setReportUIMode = BackgroundController.setReportUIMode;
      window.logOut = BackgroundController.logOut;

      window.processLogFile = BackgroundController.processLogFile;
      window.startLiveLoggingSession = BackgroundController.startLiveLoggingSession;
      window.splitLogFile = BackgroundController.splitLogFile;
      window.cancelUploadOrLiveLog = BackgroundController.cancelUploadOrLiveLog;
      window.cancelOrFinish = BackgroundController.cancelOrFinish;
      window.stopLiveLoggingSession = BackgroundController.stopLiveLoggingSession;
      window.doneProcessing = BackgroundController.doneProcessing;
      window.deleteLogFile = BackgroundController.deleteLogFile;
      window.archiveLogFile = BackgroundController.archiveLogFile;
      window.scanLogFileForRaids = BackgroundController.scanLogFileForRaids;
      window.loadRecentReports = BackgroundController.loadRecentReports;
      window.loadRecentCharacters = BackgroundController.loadRecentCharacters;
      window.loadCharactersForReport = BackgroundController.loadCharactersForReport;
      window.setLogDirectory = BackgroundController.setLogDirectory;
      window.getFileUploadName = BackgroundController.getFileUploadName;
      window.setRegion = BackgroundController.setRegion;
      window.getRegion = BackgroundController.getRegion;
      window.isLiveLogging = BackgroundController.isLiveLogging;
      window.setLiveLogStatus = BackgroundController.setLiveLogStatus;
      window.onGameEvents = BackgroundController.onGameEvents;
      window.onInfoUpdate = BackgroundController.onInfoUpdate;
      window.getGroupFinderSortMetric = BackgroundController.getGroupFinderSortMetric;
      window.setGroupFinderSortMetric = BackgroundController.setGroupFinderSortMetric;
      window.clearGroupApplicantBadgeCount = BackgroundController.clearGroupApplicantBadgeCount;

      window.game = new Game();
      window.storage = new StorageService(window.game.prefix());
      window.sanitization = new SanitizationService();
      window.lang = new LangService();
      window.lang.setLanguage(window.storage.getStoredItem('language') || "en");
      window.userName = window.storage.getStoredItem('username') || ''
      window.game.setLanguageAndVersion(window.lang, window.storage.version());
      window._currentIPC = 1
      await this.setVersion(window.storage.version());
      this.getVersionedItems();
      window.chooseFightsToUpload = window.storage.getStoredItem('choosefights') || '';
      window.includeTrashFights = window.storage.getStoredItem('includetrash') || '';
      window.liveLogEntireFile = window.storage.getStoredItem('livelogentirefile') || '';
      window.setChooseFightsToUpload = BackgroundController.setChooseFightsToUpload;
      window.setIncludeTrashFights = BackgroundController.setIncludeTrashFights;
      window.setLiveLogEntireFile = BackgroundController.setLiveLogEntireFile;

      window.setVersion = BackgroundController.setVersion;
      window.setLanguage = BackgroundController.setLanguage;
      window.logIn = BackgroundController.logIn;

      if (!window.overwolf) {
        BackgroundController._attemptAutoLogin();
        BackgroundController._listenForWarningsFromIpc();
      } else {
        window.minimize = BackgroundController.minimize;
        document.getElementById('parser').setAttribute('src', window.game.origin() + "/client/parser");
        BackgroundController._listenForWarningsFromIpc();
        // Handle what happens when the app is launched while already running
        // (relaunch)
        BackgroundController._registerAppLaunchTriggerHandler();
        BackgroundController._attemptAutoLogin();
        // Switch between desktop/in-game windows when launching/closing game
        runningGameService.addGameRunningChangedListener(
          BackgroundController._onRunningGameChanged
        );
        const runningGameInfo = await runningGameService.getRunningGameInfo();
        if (runningGameInfo) {
          BackgroundController._onRunningGameChanged(
            runningGameInfo.isRunning,
            runningGameInfo.executionPath,
            runningGameInfo.classId);
        }
  
        // Register handlers to hotkey events
        BackgroundController._registerHotkeys();
  
        await BackgroundController._restoreLaunchWindow();
  
        // Listen to changes in windows
        overwolf.windows.onStateChanged.addListener(async (data) => {
          if (data.window_state !== 'closed' || data.window_previous_state === 'closed')
            return;

          const mainWindow = overwolf.windows.getMainWindow();
          mainWindow.eventBus.trigger("windowClosed", data.window_name);

          if (mainWindow._closeBackgroundWindowTimeout)
            clearTimeout(mainWindow._closeBackgroundWindowTimeout);

          mainWindow._closeBackgroundWindowTimeout = setTimeout(async () => {
            await overwolf.windows.getWindowsStates(windowStates => {
              if (!windowStates.success) {
                console.error(windowStates);
                return;
              }

              const numberOfWindowsOpen = Object.values(windowStates.resultV2).filter(x => x !== "closed" && x !== "hidden").length;
              const closeBackgroundWindow = numberOfWindowsOpen === 0;

              if (closeBackgroundWindow) {
                window.close();
              }
            });
          }, 60000);
        });
      }
    }

    static _listenForWarningsFromIpc() {
      if (window.overwolf) {
        window.addEventListener("message", event => {
          if (event.data && event.data.message === "set-warning-text" && event.data.data) {
            window.eventBus.trigger("setWarningText", event.data.data);
          }
        });
      } else {
        document.getElementById('parser').addEventListener('ipc-message', (event) => {
          if (event.channel == "set-warning-text") {
            window.eventBus.trigger("setWarningText", event.args[0]);
          }
        });
      }
    }
  
    /**
     * Minimize all app windows
     * @public
     */
    static async minimize() {
      const openWindows = await WindowsService.getOpenWindows();
      for (let windowName in openWindows) {
        await WindowsService.minimize(windowName);
      }
    }
  
  
    /**
     * Handle game opening/closing
     * @private
     */
    static async _onRunningGameChanged(isGameRunning, executionPath, gameId) {
      if (window.game.overwolfGameIds().indexOf(gameId) === -1)
        return;

      if (isGameRunning) {
        // Register to game events
        gepService.registerToGEP(
          BackgroundController.onGameEvents,
          BackgroundController.onInfoUpdate
        );
        
        // Don't switch versions if the user is still uploading for another
        // game version. Just leave it alone.
        let version = window.game.versionForExecutionPath(executionPath);
        if (version != window.storage.version() && !window._uploader)
          await window.setVersion(version);
        
        if (!window._uploader) {
          window.runningGameLiveLogLocation = window.game.determineLiveLogLocation(executionPath);
          if (!window.storage.getVersionedStoredItem("directory"))
            window.setLogDirectory(window.runningGameLiveLogLocation, true);
        } else
          window.runningGameLiveLogLocation = '';

        // Open in-game window
        await WindowsService.restore(WindowNames.IN_GAME);
        
        // WindowsService.close(WindowNames.DESKTOP);
      } else {
        window.runningGameLiveLogLocation = '';
        
        if (BackgroundController.isLiveLogging())
          await WindowsService.restore(WindowNames.DESKTOP);
        
        // Close in-game windows
        WindowsService.close(WindowNames.IN_GAME);
        WindowsService.close(WindowNames.CHARACTERS_IN_GAME);
        WindowsService.close(WindowNames.REPORTS_IN_GAME);
        WindowsService.close(WindowNames.GUILDS_IN_GAME);
        WindowsService.close(WindowNames.LIVELOG);
      }
    }
  
  
    /**
     * Open the relevant window on app launch
     * @private
     */
    static async _restoreLaunchWindow() {
      // Obtain windows and set their sizes:
      // Desktop:
      const desktopWindowName = WindowNames.DESKTOP;
      const desktopWindow = await WindowsService.obtainWindow(desktopWindowName);
     
      //await WindowsService.changeSize(desktopWindow.window.id, 1200, 659);
      
      // In-Game:
      const inGameWindow = await WindowsService.obtainWindow(
        WindowNames.IN_GAME
      );
      //await WindowsService.changeSize(inGameWindow.window.id, 380, 350);
  
      const isGameRunning = await runningGameService.isGameRunning();
      
      // Game isn't running, display desktop window
      if (!isGameRunning) {
        await WindowsService.restore(desktopWindowName);
      }
      else {
        gepService.registerToGEP(
          BackgroundController.onGameEvents,
          BackgroundController.onInfoUpdate
        );
        await WindowsService.restore(WindowNames.IN_GAME);
      }
  
      let wasCentered = localStorage.getItem("wasCentered-" + desktopWindowName);
      if (!wasCentered) {
        await WindowsService.changePositionCenter(desktopWindowName);
        localStorage.setItem("wasCentered-" + desktopWindowName, true);
      }
    }
  
  
    /**
     * handles app launch trigger event - i.e dock icon clicked
     * @private
     */
    static _registerAppLaunchTriggerHandler() {
      overwolf.extensions.onAppLaunchTriggered.removeListener(
        BackgroundController._onAppRelaunch
      );
      overwolf.extensions.onAppLaunchTriggered.addListener(
        BackgroundController._onAppRelaunch
      );
    }
  
    static async _onAppRelaunch(event) {
      const isGameRunning = await runningGameService.isGameRunning();
      if (event.origin === 'dock' && isGameRunning) {
        let inGameWindowState = await WindowsService.getWindowState(WindowNames.IN_GAME);
        if (inGameWindowState !== 'normal') {
          await WindowsService.restore(WindowNames.IN_GAME);
        }
      } else {
        await WindowsService.restore(WindowNames.DESKTOP);
        await WindowsService.bringToFront(WindowNames.DESKTOP, true);
      }
    }
  
  
    /**
     * set custom hotkey behavior
     * @private
     */
    static _registerHotkeys() {
      hotkeysService.setToggleHotkey(async () => {
        let inGameWindowState = await WindowsService.getWindowState(WindowNames.IN_GAME);
        if (inGameWindowState !== 'normal') {
          WindowsService.restore(WindowNames.IN_GAME);
        } else {
          await Promise.all(WindowNames.IN_GAME_WINDOWS.map(async windowName => {
            let inGameWindowState = await WindowsService.getWindowState(windowName);
            if (inGameWindowState === 'normal') {
              WindowsService.minimize(windowName);
            }
          }));
        }
      });

      hotkeysService.setCallWipeHotkey(async () => {
        if (!this.isLiveLogging()) {
          window.eventBus.trigger('setInGameNotification', {
            notificationText: window.lang.trans('can_only_call_a_wipe_when_live_logging'),
            dismissable: true,
            autoDismiss: false
          });
          return;
        }

        try {
          window.eventBus.trigger('setInGameNotification', {
            notificationText: window.lang.trans('calling_wipe'),
            dismissable: false,
            autoDismiss: false
          });
          await this.ipcCallWipe();
          window.eventBus.trigger('setInGameNotification', {
            notificationText: window.lang.trans('wipe_called'),
            dismissable: true,
            autoDismiss: true
          });
        } catch {
          window.eventBus.trigger('setInGameNotification', {
            notificationText: window.lang.trans('failed_to_call_wipe'),
            dismissable: true,
            autoDismiss: false
          });
        }
      })
    }
  
    static async _toggleInGameWindow(windowName, showIfClosed = false)
    {
      let state = await WindowsService.getWindowState(windowName);
      if (state === "minimized" || (showIfClosed && state === "closed")) {
        WindowsService.restore(windowName);
      } else if (state === "normal" || state === "maximized") {
        WindowsService.minimize(windowName);
      }
    }
  
    static _attemptAutoLogin() {
      window.loggedIn = BackendState.NOT_LOGGED_IN;
      window.autoLogin = window.storage.getStoredItem('autologin') || false
      if (!window.autoLogin) {
        window.loggedIn = BackendState.LOGIN_FAILED;
        window.eventBus.trigger("autoLoginFailed", null);
        return;
      }

      var request = new XMLHttpRequest()
      request.onload = function (evt) {
        if (request.status != 200) {
          window.loggedIn = BackendState.LOGIN_FAILED;
          window.eventBus.trigger("autoLoginFailed", request.status);
          return;
        }
  
        var json = null
        try {
          json = window.sanitization.sanitizeHtmlStringsInJson(JSON.parse(request.responseText))
        } catch (e) {
          window.loggedIn = BackendState.LOGIN_FAILED;
          window.eventBus.trigger("autoLoginFailed", e);
          return;
        }
  
        if (json.success) {
          window.loggedIn = BackendState.LOGGED_IN;
          window.guildsAndCharacters = json;
          window.eventBus.trigger("loggedIn", json);
        } else {
          window.loggedIn = BackendState.LOGIN_FAILED;
          window.eventBus.trigger("autoLoginFailed", json);
        }
      };
  
      request.open("GET", window.game.origin() + "/client/check/?email=" + encodeURIComponent(window.userName) + "&version=" + window._internalVersion);
      request.send()
    }

    static setLogDirectory(path, updateFileInputs) {
      window.storage.setVersionedStoredItem('directory', path);
      window.directoryUploadName = window.storage.getVersionedStoredItem('directory') || '';
      window.eventBus.trigger('setLogDirectory', {
        directoryUploadName: window.directoryUploadName,
        updateFileInputs
      });
    }

    static setRegion(region) {
      window.storage.setVersionedStoredItem('region', region);
    }

    static getRegion() {
      const initialRegion = window.game.initialRegion();

      const regionString = !window.game.defaultRegion()
        ? (window.storage.getVersionedStoredItem('region') || initialRegion)
        : initialRegion;

      if (regionString === '') return 0;

      return parseInt(regionString);
    }

    static getVersionedItems() {
      window.guildID = window.storage.getVersionedStoredItem('guild') || '';
      window.teamID = window.storage.getVersionedStoredItem('team') || '';
      window.directoryUploadName = window.storage.getVersionedStoredItem('directory') || '';
      window.defaultReportVisibility = window.storage.getVersionedStoredItem('visibility') || '';
    }

    static async getFileUploadName() {
      const fs = new FS()
      await fs.init()
      try {
        const pattern = "*" + window.game.logFileName()
        return await fs.getLatestFileInDirectoryByPattern(window.directoryUploadName, pattern);
      } catch {
        return '';
      }
    }
  
    static async ipcClearParserFights() {
      return new Promise(function (resolve) {
        var parser = document.getElementById('parser')
        var eventFunc = (event) => {
          if (event.channel ==  "clear-fights-completed" || event.data && event.data.message == "clear-fights-completed") {
            if (event.args && event.args[0] !== window._currentIPC || event.data && event.data.id != window._currentIPC)
              resolve(false)
            resolve(true)
            if (window._uploader)
              window._uploader.clearCollectedFights();
            if ('undefined' !== typeof overwolf) {
              window.removeEventListener("message", eventFunc);
              return
            }
            parser.removeEventListener("ipc-message", eventFunc);
          }
        };
  
        if ('undefined' !== typeof overwolf) {
          window.addEventListener('message', eventFunc);
          parser.contentWindow.postMessage({ message: 'clear-fights', id: window._currentIPC }, '*')
          return
        }
  
        parser.addEventListener('ipc-message', eventFunc);
        parser.send('clear-fights', window._currentIPC)
      });
    }
  
    static async ipcClearParserState() {
      console.log("****** CLEARED *******")
      return new Promise(function (resolve) {
        var parser = document.getElementById('parser')
        var eventFunc = (event) => {
          if (event.channel ==  "clear-state-completed" || event.data.message == "clear-state-completed") {
            if (event.args && event.args[0] !== window._currentIPC || event.data && event.data.id != window._currentIPC)
              resolve(false)
            resolve(true)
            if ('undefined' !== typeof overwolf) {
              window.removeEventListener("message", eventFunc);
              return 
            }
            parser.removeEventListener("ipc-message", eventFunc);
          }
        };
  
        if ('undefined' !== typeof overwolf) {
          window.addEventListener('message', eventFunc);
          parser.contentWindow.postMessage({ message: 'clear-state', id: window._currentIPC }, '*')
          return
        }
  
        parser.addEventListener('ipc-message', eventFunc);
        parser.send('clear-state', window._currentIPC)
      });
    }
  
    static async ipcGetParserVersion() {
      return new Promise(function (resolve) {
        var parser = document.getElementById('parser')
        var eventFunc = (event) => {
          if (window.overwolf && event.data.message == "get-parser-version-completed") {
            resolve(event.data.data);
            window.removeEventListener("message", eventFunc);
          } else if (event.channel == "get-parser-version-completed") {
            resolve(event.args[0])
            parser.removeEventListener("ipc-message", eventFunc);
          }
        };
  
        if ('undefined' !== typeof overwolf) {
          window.addEventListener('message', eventFunc);
          parser.contentWindow.postMessage({ message: 'get-parser-version' }, '*')
          return
        }
  
        parser.addEventListener('ipc-message', eventFunc);
        parser.send('get-parser-version')
      });
    }
  
    static async ipcCollectMasterFileInfo() {
      return new Promise(function (resolve) {
        var parser = document.getElementById('parser')
        var eventFunc = (event) => {
          if (window.overwolf && event.data.message == "collect-master-info-completed") {
            if (event.data.id != window._currentIPC)
              resolve(null)
            resolve(event.data)
            window.removeEventListener("message", eventFunc);
          } else if (event.channel == "collect-master-info-completed") {
            if (event.args[0] != window._currentIPC)
              resolve(null)
            resolve(event.args[1])
            parser.removeEventListener("ipc-message", eventFunc);
          }
        };
  
        if ('undefined' !== typeof overwolf) {
          window.addEventListener('message', eventFunc);
          parser.contentWindow.postMessage({ message: 'collect-master-info', id: window._currentIPC }, '*')
          return
        }
  
        parser.addEventListener('ipc-message', eventFunc);
        parser.send('collect-master-info', window._currentIPC)
      });
    }
  
    static async ipcCollectScannedRaidsFromParser() {
      return new Promise(function (resolve) {
        var parser = document.getElementById('parser')
        var eventFunc = (event) => {
          if (window.overwolf && event.data.message == "collect-scanned-raids-completed") {
            if (event.data.id != window._currentIPC)
              resolve(null)
            resolve(event.data)
            window.removeEventListener("message", eventFunc);
          } else if (event.channel == "collect-scanned-raids-completed") {
            if (event.args[0] != window._currentIPC)
              resolve(null)
            resolve(event.args[1])
            parser.removeEventListener("ipc-message", eventFunc);
          }
        };
  
        if ('undefined' !== typeof overwolf) {
          window.addEventListener('message', eventFunc);
          parser.contentWindow.postMessage({ message: 'collect-scanned-raids', id: window._currentIPC }, '*')
          return 
        }
  
        parser.addEventListener('ipc-message', eventFunc);
        parser.send('collect-scanned-raids', window._currentIPC)
      });
    }
  
    static async ipcCollectFightsFromParser(pushFightIfNeeded, scanningOnly) {
      return new Promise(function (resolve) {
        var parser = document.getElementById('parser')
        var eventFunc = (event) => {
          if (window.overwolf && event.data.message == "collect-fights-completed") {
            if (event.data.id != window._currentIPC)
              resolve(null)
            resolve(event.data)
            window.removeEventListener("message", eventFunc);
          } else if (event.channel == "collect-fights-completed") {
            if (event.args[0] != window._currentIPC)
              resolve(null)
            resolve(event.args[1])
            parser.removeEventListener("ipc-message", eventFunc);
          }
        };
  
        if ('undefined' !== typeof overwolf) {
          window.addEventListener('message', eventFunc);
          parser.contentWindow.postMessage({ message: 'collect-fights', id: window._currentIPC, pushFightIfNeeded: pushFightIfNeeded, scanningOnly: scanningOnly }, '*')
          return
        }
  
        parser.addEventListener('ipc-message', eventFunc);
        parser.send('collect-fights', window._currentIPC, pushFightIfNeeded, scanningOnly)
      });
    }
  
    static async ipcParseLogLines(lines, scanningOnly, selectedRegion, raidsToUpload) {
      return new Promise(function (resolve) {
        var parser = document.getElementById('parser')
        var eventFunc = (event) => {
          if (window.overwolf && event.data.message == "parse-lines-completed") {
            if (event.data.id != window._currentIPC)
              resolve(null)
            resolve(event.data)
            window.removeEventListener("message", eventFunc);
          } else if  (event.channel == "parse-lines-completed") {
            if (event.args[0] != window._currentIPC)
              resolve({ success: false, line: "", exception: null })
            resolve(event.args[1])
            parser.removeEventListener("ipc-message", eventFunc);
          }
        };
  
        if ('undefined' !== typeof overwolf) {
          window.addEventListener('message', eventFunc);
          parser.contentWindow.postMessage({
            message: 'parse-lines', id: window._currentIPC, lines: lines,
            selectedRegion: selectedRegion, raidsToUpload: raidsToUpload, scanning: scanningOnly
          }, '*')
          return
        }
  
        parser.addEventListener('ipc-message', eventFunc);
        parser.send('parse-lines', window._currentIPC, lines, scanningOnly, selectedRegion, raidsToUpload)
      });
    }

    static async ipcCallWipe() {
      if (window._callWipeTimeout)
        clearTimeout(window._callWipeTimeout);

      return new Promise(function (resolve, reject) {
        var parser = document.getElementById('parser')
        var eventFunc = (event) => {
          if (event.channel === "call-wipe-completed" || event.data && event.data.message === "call-wipe-completed") {
            if (event.args && event.args[0] !== window._currentIPC || event.data && event.data.id !== window._currentIPC)
              reject(false)

            resolve(true)

            if ('undefined' !== typeof overwolf) {
              window.removeEventListener("message", eventFunc);
              return
            }
            parser.removeEventListener("ipc-message", eventFunc);
          }
        };

        window._callWipeTimeout = setTimeout(() => {
          reject(false);
          if ('undefined' !== typeof overwolf) {
            window.removeEventListener("message", eventFunc);
            return
          }
          parser.removeEventListener("ipc-message", eventFunc);
        }, 5000);

        if ('undefined' !== typeof overwolf) {
          window.addEventListener('message', eventFunc);
          parser.contentWindow.postMessage({ message: 'call-wipe', id: window._currentIPC }, '*')
          return
        }

        parser.addEventListener('ipc-message', eventFunc);
        parser.send('call-wipe', window._currentIPC)
      });
    }

    static async ipcSetStartDate(startDate) {
      return new Promise(function (resolve) {
        var parser = document.getElementById('parser')
        var eventFunc = (event) => {
          if (window.overwolf && event.data.message == "set-start-date-completed") {
            if (event.data.id != window._currentIPC)
              resolve(null)
            resolve(event.data)
            window.removeEventListener("message", eventFunc);
          } else if (event.channel == "set-start-date-completed") {
            if (event.args[0] != window._currentIPC)
              resolve(null)
            resolve(event.args[1])
            parser.removeEventListener("ipc-message", eventFunc);
          }
        };

        if ('undefined' !== typeof overwolf) {
          window.addEventListener('message', eventFunc);
          parser.contentWindow.postMessage({ message: 'set-start-date', id: window._currentIPC, startDate:startDate }, '*')
          return
        }

        parser.addEventListener('ipc-message', eventFunc);
        parser.send('set-start-date', window._currentIPC, startDate)
      });
    }

    static async ipcSetLiveLoggingStartTime(startTime) {
      return new Promise(function (resolve) {
        var parser = document.getElementById('parser')
        var eventFunc = (event) => {
          if (window.overwolf && event.data.message == "set-live-logging-start-time-completed") {
            if (event.data.id != window._currentIPC)
              resolve(null)
            resolve(event.data)
            window.removeEventListener("message", eventFunc);
          } else if (event.channel == "set-live-logging-start-time-completed") {
            if (event.args[0] != window._currentIPC)
              resolve(null)
            resolve(event.args[1])
            parser.removeEventListener("ipc-message", eventFunc);
          }
        };

        if ('undefined' !== typeof overwolf) {
          window.addEventListener('message', eventFunc);
          parser.contentWindow.postMessage({ message: 'set-live-logging-start-time', id: window._currentIPC, startTime:startTime }, '*')
          return
        }

        parser.addEventListener('ipc-message', eventFunc);
        parser.send('set-live-logging-start-time', window._currentIPC, startTime)
      });
    }

    static ipcIncrementCurrent()
    {
      window._currentIPC++
    }

    static setErrorText(text) {
      setErrorText(text);
    }

    static setWarningText(text) {
      setWarningText(text);
    }

    static async goHome() {
      setErrorText('');
      setWarningText('');
      await cancelUploadOrLiveLog();
      await cancelOrFinish('first')
    }

    static async viewLogInGame(code, fight) {
      await this.loadRecentReports();

      const windowStateResult = await WindowsService.getWindowState(WindowNames.REPORTS_IN_GAME);
      await WindowsService.restore(WindowNames.REPORTS_IN_GAME);
      await WindowsService.minimizeIfOpen(WindowNames.CHARACTERS_IN_GAME);
      await WindowsService.minimizeIfOpen(WindowNames.GUILDS_IN_GAME);

      setTimeout(() => {
        window.eventBus.trigger('viewLogInGame', {
          code,
          fight
        });
      }, windowStateResult.window_state === 'normal' ? 0 : 500);
    }

    static setReportUIMode(mode, doNotUpdateFileBrowsers) {
      window.eventBus.trigger("setReportUIMode", {
        mode, doNotUpdateFileBrowsers
      });
    }
  
    static async logOut() {
      await cancelUploadOrLiveLog();
      window._autoLogin = false;
      window.storage.removeStoredItem('autologin');
      window.loggedIn = BackendState.NOT_LOGGED_IN;

      if (window.overwolf) {
        await Promise.all([
          WindowNames.CHARACTERS,
          WindowNames.CHARACTERS_IN_GAME,
          WindowNames.GUILDS,
          WindowNames.GUILDS_IN_GAME,
          WindowNames.REPORTS,
          WindowNames.REPORTS_IN_GAME,
        ].map(async windowName => await WindowsService.close(windowName)))
      }

      window.eventBus.trigger("loggedOut", true);
    }
  
    static logIn(user, password) {
      window.loggedIn = BackendState.NOT_LOGGED_IN;
  
      var loginFormData = new FormData();
  
      loginFormData.append("version", window._internalVersion)
      loginFormData.append("email", user)
      loginFormData.append("password", password)

      var request = new XMLHttpRequest()
      request.onload = function (evt) {
        if (request.status != 200) {
          window.loggedIn = BackendState.LOGIN_FAILED;
          window.eventBus.trigger("loginFailed", window.lang.trans("login_error"));
          return;
        }
  
  
        var json = null
        try {
          json = window.sanitization.sanitizeHtmlStringsInJson(JSON.parse(request.responseText))
        } catch (e) {
          window.loggedIn = BackendState.LOGIN_FAILED;
          window.eventBus.trigger("loginFailed", window.lang.trans("login_error"));
          return;
        }

        if (json.success) {
          window.loggedIn = BackendState.LOGGED_IN;
          if (!window.autoLogin) {
            window.autoLogin = true;
            window.storage.setStoredItem('autologin', true);
          }

          window.storage.setStoredItem('username', user);
          window.userName = user;
          window.guildsAndCharacters = json;
          window.eventBus.trigger("loggedIn", json);
        } else {
          window.loggedIn = BackendState.LOGIN_FAILED;
          window.eventBus.trigger("loginFailed", !json.errors ? window.lang.trans("empty_response_error") : json.errors);
        }

        var json = null
        try {
          json = window.sanitization.sanitizeHtmlStringsInJson(JSON.parse(request.responseText));
        } catch (e) {
          setErrorText(trans("login_error"))
          return;
        }
      };
      request.onerror = function(event) {
        window.loggedIn = BackendState.LOGIN_FAILED;
        window.eventBus.trigger("loginFailed", window.lang.trans("login_error"));
      }
      request.open("POST", window.game.scheme() + "://" + window.game.host() + "/client/login/");
      request.send(loginFormData);
    }

    static async setVersion(version) {
      version = window.game.modifyVersionForLanguage(version, window.lang.language());
      window.storage.setStoredItem("version", version);
      window.storage.setVersion(version);
      window.game.setLanguageAndVersion(window.lang, version);

      BackgroundController.getVersionedItems();

      window.loggedIn = BackendState.NOT_LOGGED_IN;

      window.eventBus.trigger("reload", true);

      BackgroundController._attemptAutoLogin();
    }

    static async setLanguage(language) {
      window.storage.setStoredItem("language", language);
      window.lang.setLanguage(language);

      await this.setVersion(window.storage.version());
    }

    static setChooseFightsToUpload(checked) {
      window.chooseFightsToUpload = checked ? "1" : "0";
      window.storage.setStoredItem("choosefights", window.chooseFightsToUpload)
    }

    static setIncludeTrashFights(checked) {
      window.includeTrashFights = checked ? "1" : "0";
      window.storage.setStoredItem("includetrash", window.includeTrashFights)
    }

    static setLiveLogEntireFile(checked) {
      window.liveLogEntireFile = checked ? "1" : "0";
      window.storage.setStoredItem("livelogentirefile", window.liveLogEntireFile)
    }

    /**
     * Pass events to windows that are listening to them
     * @private
     */
    static onGameEvents(data) {
      console.log("EVENT: ", data);
    }

    /**
     * Pass info updates to windows that are listening to them
     * @private
     */
    static onInfoUpdate(data) {
      console.log("INFO: ", data);

      window._latestInfoUpdate = data;

      if (window.game.handleGameInfoUpdate)
        window.game.handleGameInfoUpdate(data, window.eventBus.trigger);
    }

    static async doneProcessing() {
      window._uploader = null
      window.eventBus.trigger("setUploadProgressContainer", false)
    }

    static async cancelUploadOrLiveLog() {
      if (window._uploader)
        await window._uploader.cancelUploadOrLiveLog()
      await doneProcessing()
    }

    static async stopLiveLoggingSession() {
      if (window._uploader)
        await window._uploader.stopLiveLoggingSession();
    }

    static async cancelOrFinish(page) {
      window.eventBus.trigger("cancelOrFinish", page);
    }

    static async startLiveLoggingSession(reportMeta, logDir) {
      const uploader = await BackgroundController.prepUploader()
      if (!uploader) {
        return
      }

      await uploader.liveLog(reportMeta, logDir, BackgroundController.getRegion(), window.liveLogEntireFile)
    }

    static async splitLogFile(logDir) {
      const uploader = await BackgroundController.prepUploader()
      if (!uploader) {
        return
      }

      try {
        await uploader.splitLogFile(logDir, BackgroundController.getRegion())
      } catch(e) {
        setErrorText(window.lang.trans("invalid_file_selected_error"))
        BackgroundController.cancelUploadOrLiveLog()
      }
    }

    static async processLogFile(reportMeta, filePath, raidsToUpload) {
      const uploader = await BackgroundController.prepUploader()
      if (!uploader) {
        return
      }

      await uploader.upload(reportMeta, filePath, raidsToUpload, BackgroundController.getRegion())
    }

    static async scanLogFileForRaids(reportMeta, filePath) {
      const uploader = await BackgroundController.prepUploader()
      if (!uploader) {
        return
      }

      try {
        await uploader.scanLogFileForRaids(reportMeta, filePath, BackgroundController.getRegion())
      } catch(e) {
        setErrorText(window.lang.trans("invalid_file_selected_error"))
        BackgroundController.cancelUploadOrLiveLog()
      }
    }

    static async deleteLogFile(fileForDeletionAndArchival) {
        if (!fileForDeletionAndArchival) {
          window.eventBus.trigger('deletionSucceeded')
          return
        }

        const fs = new FS()
        await fs.init()
        try {
            await fs.unlinkSync(fileForDeletionAndArchival)
            window.eventBus.trigger('deletionSucceeded')
        } catch(e) {
          window.eventBus.trigger('deletionFailed')
        }
    }

    static async archiveLogFile(fileForDeletionAndArchival) {
      if (!fileForDeletionAndArchival) {
        window.eventBus.trigger('archivalSucceeded')
        return
      }

      const fs = new FS()
      await fs.init()

      try {
          let e, t = fileForDeletionAndArchival, i = t.lastIndexOf("."), o = i > -1, r = "";
      o ? (e = t.substring(0, i), r = t.substring(i)) : e = t;

      const l = fs.dirName(fileForDeletionAndArchival);
      const fileName = "Archive" + e.split(fs.separator()).pop()
      const archiveDir = l + fs.separator() + game.prefix() + "logsarchive" + fs.separator()
      const archivedFile = archiveDir + fileName + "-" + escapedISOString(new Date()) + r

      fs.createDirectoryIfNeeded(archiveDir)
        
      const result = await fs.move(fileForDeletionAndArchival, archivedFile)
      if (result) {
        window.eventBus.trigger('archivalSucceeded')
      } else {
        window.eventBus.trigger('archivalFailed')
      }
      this.fileForDeletionAndArchival = null;
      } catch (a) {
        window.eventBus.trigger('archivalFailed')
      }
    }

    static async prepUploader() {
      if (window._uploader)
        return null

      const initializePlugin = !!OverwolfPlugin ? () => {
        this.plugin = new OverwolfPlugin("simple-io-plugin", true)
        return new Promise((resolve, reject) => {
          this.plugin.initialize( (status) => {
              console.log("Overwolf plugin initialized: ", status)
              if (status) {
                  resolve("GOOD")
              } else {
                  reject("BAD")
              }
          })
      })
    } : () => {
      // no-op
    }

      const Uploader = UploaderBuilder(
        LargeAsyncFileReader,
        Report,
        ChunkConsumerBuilder,
        UIDelegate,
        FS,
        initializePlugin,
        ZipFile,
        FileStream,
    )

      const uploader = new Uploader(
        error => {
          setErrorText(error)
          BackgroundController.cancelUploadOrLiveLog()
      })

      window._uploader = uploader

      const result = await uploader.init({
        ipcParseLogLines: BackgroundController.ipcParseLogLines,
        ipcCollectFightsFromParser: BackgroundController.ipcCollectFightsFromParser,
        ipcCollectScannedRaidsFromParser: BackgroundController.ipcCollectScannedRaidsFromParser,
        ipcClearParserState: BackgroundController.ipcClearParserState,
        ipcClearParserFights: BackgroundController.ipcClearParserFights,
        ipcCollectMasterFileInfo: BackgroundController.ipcCollectMasterFileInfo,
        ipcGetParserVersion: BackgroundController.ipcGetParserVersion,
        ipcSetStartDate: BackgroundController.ipcSetStartDate,
        ipcSetLiveLoggingStartTime: BackgroundController.ipcSetLiveLoggingStartTime,
        ipcIncrementCurrent: BackgroundController.ipcIncrementCurrent
      })
      if (!result) {
        alert("Failed to initiate upload.")
        return
      }

      return uploader
    }

    static buildCharacterListFromJSON() {
      let json = window.guildsAndCharacters;
      if (!json.characters || !json.characters.length)
        return "";
      let charactersResult = '<div id="my-characters-caption">';
      charactersResult += window.lang.trans('my_characters') + '</div>';
      charactersResult += '<div id="my-characters-contents" ';
      if (json.characters.length > 4)
        charactersResult += 'class="compact"';
      charactersResult += '>';

      for (var i = 0; i < json.characters.length; ++i) {
        let character = json.characters[i];
        charactersResult += '<div class="my-characters-entry" characterid="' + character.id + '">';
        charactersResult += '<div class="my-characters-thumbnail">';
        charactersResult += '<img class="my-characters-thumbnail-image" src="' + character.thumbnail + '">';
        charactersResult += "</div>";
        charactersResult += '<div class="my-characters-name-and-server">';
        charactersResult += '<div class="my-characters-name ' + character.className + '">' + character.name + "</div>";
        charactersResult += '<div class="my-characters-server">' + character.serverName + ' (' + character.regionName + ')</div>';

        charactersResult += "</div></div>";

      }
      charactersResult += "</div>";
      return charactersResult;
    }

    static buildGuildIconSrc(guild) {
      return (guild.icon && guild.icon.startsWith('https://pbs.twimg.com/profile_images/'))
        ? guild.icon
        : `https://assets.rpglogs.com/img/${game.prefix()}/faction-${guild.faction}.png`;
    }

    static buildGuildIconClass(guild) {
      return (guild.icon && guild.icon.startsWith('https://pbs.twimg.com/profile_images/'))
        ? 'circular-border'
        : '';
    }

    static buildGuildsViewList() {
      let json = window.guildsAndCharacters;
      let guildsResult = '<div id="my-guilds-caption">';
      guildsResult += window.lang.trans('my_guilds') + '</div>';
      guildsResult += '<div id="my-guilds-contents">';

      let regions = [];
      for (let j = 0; j < json.regions.length; j++) {
        regions[json.regions[j].id] = json.regions[j].name;
      }

      for (var i = 0; i < json.guilds.length; ++i) {
        let guild = json.guilds[i];
        guildsResult += '<div class="my-guilds-entry" guildid="' + guild.id + '">';
        guildsResult += '<div class="my-guilds-thumbnail">';
        guildsResult += `<img class="my-guilds-thumbnail-image ${this.buildGuildIconClass(guild)}" src="${this.buildGuildIconSrc(guild)}">`;
        guildsResult += "</div>";
        guildsResult += '<div class="my-guilds-name-and-server">';
        guildsResult += '<div class="my-guilds-name faction-' + guild.faction + '">' + guild.name + "</div>";

        let region = regions[guild.regionid] ? regions[guild.regionid] : '';
        guildsResult += '<div class="my-guilds-server">' + guild.server + ' (' + region + ')</div>';

        guildsResult += "</div></div>";

      }
      guildsResult += "</div>";
      return guildsResult;
    }

    static buildGuildListFromJSON() {
      let json = window.guildsAndCharacters;

      const guilds = [
        {
          id: 0,
          name: json.personalLogsStr,
          faction: json.personalFaction,
          isPersonalLogs: true
        },
        ...json.guilds
      ];
      const numberOfGuilds = guilds.length;
      const maximumNumberOfRows = 5;
      const numberOfColumns = Math.ceil(numberOfGuilds / maximumNumberOfRows);
      const numberOfRows = Math.min(numberOfGuilds, maximumNumberOfRows);

      const guildsHtml = `
        <li id="guild-selection-container">
          <a>
            <span id="guild-selection-text"></span>
          </a>
          <ul id="guilds-list">
            <table>
              ${[...Array(numberOfRows).keys()].map(rowIndex => `
                <tr>
                  ${[...Array(numberOfColumns).keys()].map(columnIndex => {
                    const guildIndex = columnIndex * numberOfRows + rowIndex;
                    if (guildIndex >= numberOfGuilds)
                      return '';
                    
                    const guild = guilds[guildIndex];
                    
                    return `
                      <td>
                        <li style="overflow: hidden">
                          <a href="#"
                             id="guild-${guild.id}"
                             guildid="${guild.id}">
                            <span class="faction-${guild.faction}">
                              <img class="guild-icon ${this.buildGuildIconClass(guild)}"
                                   src="${this.buildGuildIconSrc(guild)}">
                              ${guild.name}
                            </span>
                          </a>
                        </li>
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </table>
          </ul>
        </li>
      `;

      const teamsHtml = guilds
        .filter(guild => !guild.isPersonalLogs)
        .map(guild => `
          <li class="${guild.teams.length ? '' : 'empty-teams'}"
              style="display: none"
              id="teams-${guild.id}">
            <a>
              <span class="team-selection-text"></span>
            </a>
            <ul>
              <li>
                <a href="#"
                   id="teams-${guild.id}-0"
                   teamid="0">
                  ${json.noneStr}
                </a>
              </li>
              ${guild.teams.map(team => `
                <li>
                  <a href="#"
                     id="teams-${guild.id}-${team.id}"
                     teamid="${team.id}">
                    ${team.name}
                </a>
                </li>
              `).join('')}
            </ul>
          </li>
        `).join('');

      const regionsHtml = `
        <li id="regions" style="display: none">
          <a>
            <span id="regions-selection-text"></span>
          </a>
          <ul>
            ${json.regions.map(region => `
              <a href="#"
                 id="region-${region.id}"
                 regionid="${region.id}">
                ${region.name}
              </a>
            `).join('')}
          </ul>
        </li>
      `;

      return guildsHtml + teamsHtml + regionsHtml;
    }
    
    static async loadRecentReports() {
      return new Promise((resolve, reject) => {
        var request = new XMLHttpRequest()
        request.onload = function (evt) {
          if (request.status != 200)
            return;

          var json = null;
          try {
            json = window.sanitization.sanitizeHtmlStringsInJson(JSON.parse(request.responseText))
          } catch (e) {
            reject(e);
            return;
          }

          if (json.reports) {
            let reports = json.reports;
            reports.sort((a,b) => { return b.end_time - a.end_time });
            window.eventBus.trigger("reportsUpdated", reports);
            resolve(reports);
          }
        }

        request.open("GET", window.game.origin() + "/home/recent-reports")

        request.send()
      });
    }
  
    static isLiveLogging()
    {
      return window._uploader && window._uploader.liveLogging;
    }

    static setLiveLogStatus(status) {
      window.eventBus.trigger("liveLogStatusChanged", status);
    }

    static loadRecentCharacters() {
      var request = new XMLHttpRequest()
      request.onload = function (evt) {
        if (request.status != 200)
          return;

        var json = null;
        try {
          json = window.sanitization.sanitizeHtmlStringsInJson(JSON.parse(request.responseText))
        } catch (e) {
          return;
        }

        if (json.reports) {
          let reports = json.reports;

          if (reports.length) {
            reports.sort((a, b) => b.end_time - a.end_time);
            window.loadCharactersForReport(reports[0].code)
          }
        }
      }

      request.open("GET", window.game.origin() + "/home/recent-reports")

      request.send()
    }
    
    static loadCharactersForReport(code)
    {
      var request = new XMLHttpRequest()
      request.onload = function (evt) {
        if (request.status != 200)
          return;
  
        var json = null;
        try {
          json = window.sanitization.sanitizeHtmlStringsInJson(JSON.parse(request.responseText))
        } catch (e) {
          return;
        }
  
        if (json.characters) {
          window._charactersJSON = json;
          window.eventBus.trigger("charactersUpdated", json);
        }
      };
  
      request.open("GET", window.game.origin() + "/reports/characters/" + code);
      request.send()
    }

    static getGroupFinderSortMetric() {
      return window.storage.getStoredItem("groupFinderSortMetric") || window.game.defaultGroupApplicantSortMetric();
    }

    static setGroupFinderSortMetric(value) {
      window.storage.setStoredItem("groupFinderSortMetric", value);
    }

    static clearGroupApplicantBadgeCount() {
      window.game.badgeCount = 0;
      window.eventBus.trigger("clearGroupApplicantBadgeCount", 0);
    }
}
   

return BackgroundController;
});
