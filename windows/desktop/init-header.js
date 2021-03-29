function initMainWindow(overwolf) {
    let mainWindow = overwolf.windows.getMainWindow();
    let lang = mainWindow.lang;
    let game = mainWindow.game;
    let storage = mainWindow.storage;
    return { mainWindow, lang, game, storage }
}

const { mainWindow, lang, game, storage } = initMainWindow(overwolf)