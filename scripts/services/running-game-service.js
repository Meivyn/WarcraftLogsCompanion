/**
 * Detect whether a game is currently running
 */
define(function () {

  let _gameRunningChangedListeners = [];

  function _init() {
    overwolf.games.onGameInfoUpdated.removeListener(_onGameInfoUpdated);
    overwolf.games.onGameInfoUpdated.addListener(_onGameInfoUpdated);
  }

  /**
   * A game info was updated (running state, or other state changed such as
   * resolution changed)
   * @param event
   * @private
   */
  function _onGameInfoUpdated(event) {
    let gameRunning;
    let executionPath;
    let gameId;

    if (event &&
      (event.runningChanged || event.gameChanged)) {
      gameRunning = (event.gameInfo && event.gameInfo.isRunning);
      executionPath = (event.gameInfo && event.gameInfo.executionPath);
      gameId = (event.gameInfo && event.gameInfo.classId);
      for (let listener of _gameRunningChangedListeners) {
        listener(gameRunning, executionPath, gameId);
      }
    }
  }

  async function isGameRunning() {
    let gameRunning = await _isGameRunning();
    return gameRunning;
  }

  async function getRunningGameInfo() {
    return await _getRunningGameInfo();
  }

  function _getRunningGameInfo() {
    return new Promise((resolve => {
      // get the current running game info if any game is running
      overwolf.games.getRunningGameInfo(function (runningGameInfo) {
        resolve(runningGameInfo)
      });
    }));
  }

  function _isGameRunning() {
    return new Promise((resolve => {
      // get the current running game info if any game is running
      overwolf.games.getRunningGameInfo(function (runningGameInfo) {
        if (runningGameInfo && runningGameInfo.isRunning) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    }));
  }
  
  function addGameRunningChangedListener(callback) {
    _gameRunningChangedListeners.push(callback);
  }

  _init();

  return {
    isGameRunning,
    addGameRunningChangedListener,
    getRunningGameInfo
  }
});