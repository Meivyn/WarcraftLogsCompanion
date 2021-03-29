define(
    [
        "../3rdparty/overwolfplugin.js",
    ],
    function () {
        class FS {
            constructor() {
                this.init = this.init.bind(this)
                this.unlinkSync = this.unlinkSync.bind(this)
                this.existsSync = this.existsSync.bind(this)
                this.move = this.move.bind(this)
                this.getFileInfo = this.getFileInfo.bind(this)
                this.getLatestFileInDirectoryByPattern = this.getLatestFileInDirectoryByPattern.bind(this)
            }

            init() {
                this.plugin = new OverwolfPlugin("simple-io-plugin", true)
                return new Promise((resolve, reject) => {
                    this.plugin.initialize((status) => {
                        console.log("Overwolf plugin initialized: ", status)
                        if (!status) {
                            reject()
                            return
                        }

                        this.plugin.get().createFile(this.filePath, this.id, result => {
                            if (result) {
                                resolve()
                            } else {
                                reject()
                            }
                        })
                    })
                })
            }

            unlinkSync(file) {
                return new Promise((resolve, reject) => {
                    this.plugin.get().deleteFile(file, result => {
                        if (result && result.status === "success") {
                            resolve(true)
                        } else {
                            reject(result)
                        }
                    })
                })
            }

            existsSync(filePath) {
                return new Promise((success) => this.plugin.get().getFileInfo(filePath, result => {
                    if (result.status === "error") {
                        success(false)
                    } else {
                        success(true)
                    }
                }))
            }

            createDirectoryIfNeeded(dir) {}

            move(source, target) {
                return new Promise((success) => this.plugin.get().move(source, target, result => {
                    if (result.status === "error") {
                        success(false)
                    } else {
                        success(true)
                    }
                }))
            }

            getFileInfo(logFile) {
                return new Promise( (success, reject) => this.plugin.get().getFileInfo(logFile, result => {
                    if (result.status === "error") {
                        reject()
                    } else {
                        success(result)
                    }
                }))
            }

            getLatestFileInDirectoryByPattern(path, searchPattern) {
                return new Promise((success, reject) => this.plugin.get().getLatestFileInDirectoryByPattern(path, searchPattern, result => {
                    if (result.status === "error" || !result.mostRecentMatchingFile) {
                        reject()
                    } else {
                        success(result.mostRecentMatchingFile.split('/').join('\\'))
                    }
                }))
            }

            dirName(file) {
                return file.match(/(.*)[\/\\]/)[1]||'';
            }

            separator() { return '\\'; }
        }

        return FS;
    }
)

