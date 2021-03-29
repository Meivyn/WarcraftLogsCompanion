define(
    function () { 
        return function (
    LargeAsyncFileReader,
    Report, 
    ChunkConsumerBuilder, 
    UIDelegate,
    FS,
    initializePlugin,
    ZipFile,
    FileStream,
) {     
     
const {
    trans,
    setProgressStatusText,
    updateProgress,
    setCancelButtonVisible,
    selectReportPage,
    setErrorText,
    logToDebugPanel,
    setLastReportCode,
} = UIDelegate

const liveLogChangeInterval = 5000
const ChunkConsumer = ChunkConsumerBuilder(ZipFile, UIDelegate, FileStream, FS)

class Uploader {

    constructor(onFatalError) {
        this.reportCode = ""
        this.liveLogLastModified = ""
        this.liveLogLastSize = 0
        this.liveLogStartingPosition = 0
        this.debugMode = false
        this.unchangedCount = 0
        this.id = new Date().getTime()
        this.liveLogging = false
        
        this.createReport = this.createReport.bind(this)
        this.openFile = this.openFile.bind(this)
        this.liveLog = this.liveLog.bind(this)
        this.cancelUploadOrLiveLog = this.cancelUploadOrLiveLog.bind(this)
        this.createBaseUrl = this.createBaseUrl.bind(this)
        this.checkForLiveLogChanges = this.checkForLiveLogChanges.bind(this)
        this.onFatalError = onFatalError
    }
    
    async init(ipc, gameContext) {
        this.ipc = ipc
        const fs = new FS()
        await fs.init()
        this.fs = fs

        const { game } = window
        this.scheme = game.scheme()
        this.host = game.host()
        this.gameContext = gameContext

        if (window.overwolf)
            return initializePlugin()
        return "success"
    }

    async cancelUploadOrLiveLog() {
        if (this.fileBuffer) {
            this.fileBuffer.close()
            this.fileBuffer = null
        }
        if (this.consumer)
            await this.consumer.cancelUploadOrLiveLog()
        else
            this.clearCurrentTimeout()
    }

    async stopLiveLoggingSession() {
        if (this.consumer)
            await this.consumer.stopLiveLoggingSession();
        else {
            this.clearCurrentTimeout();
            UIDelegate.handleLogDeletionAndArchival();
        }
    }

    async createReport(               
        baseUrl,
        reportMeta,
    ) {
        const { ipc } = this
        const report = new Report(ipc, reportMeta, baseUrl)
        try {
            const resp = await report.createReport()
            let responseText = resp.data

            // todo - move all this into report.js
            let reportCode = ''
            if (responseText.substring(0, 7) === "Success") {
                selectReportPage('progress')
                reportCode = responseText.substring(8)
                setLastReportCode(reportCode)
                return reportCode
            } else {
                if (this.consumer) {
                    await consumer.cancelOrFinish('upload')
                }
                this.onFatalError(responseText)
            }
        } catch (e) {
            this.onFatalError("Error creating report.")
        }
    }

    async openFile(
        baseUrl, 
        reportCode, 
        file, 
        splittingLogFile, 
        scanningLogFileForRaids, 
        raidsToUpload,
        selectedRegion
    ) {
        const game = window.game

        this.fileBuffer = new LargeAsyncFileReader(game.logFileEncoding())
        const result = await this.fileBuffer.openAsync(file, 0)

        const consumer = new ChunkConsumer(
            this,
            game, 
            baseUrl, 
            file, 
            reportCode,
            this.ipc,
            false,
            splittingLogFile,
            scanningLogFileForRaids,
            raidsToUpload,
            selectedRegion
        )
        this.consumer = consumer
        const { onFatalError } = this
        consumer.setLogStream(this.fileBuffer)
        consumer.setOnFatalError(onFatalError)

        let initialText = trans("reading_log_file")
        if (splittingLogFile)
            initialText = trans("splitting_log_file")
        else if (scanningLogFileForRaids)
            initialText = trans("scanning_log_file")
    
        selectReportPage("progress")

        setProgressStatusText(initialText, "logfile-progress-status")
        updateProgress(0, "logfile-progress")
        setCancelButtonVisible(true)

        let logStartDate = game.fileStartDate(file) // This is for SWTOR only. The filename establishes what date the log was recorded on.
 	    if (logStartDate && !splittingLogFile)
 		    await this.ipc.ipcSetStartDate(logStartDate) // Make surfile the parser also knows the start date

        await consumer.readFileChunk()
    }
    
    createBaseUrl() {
        const { scheme, host } = this
        const baseUrl = window._isLocalTestMode
            ? "http://localhost:3010"
            : scheme + "://" + host
        return baseUrl
    }

    async checkForLiveLogChanges(file, previousLogFile, selectedRegion, liveLogEntireFile) {
        this.currentTimeout = 0
    
        const { game } = window

        let logFile = file
        const logFileName = game.logFileName()
        const logFileNameIsSearchPattern = logFileName.includes('?') || logFileName.includes('*')

        if (logFileNameIsSearchPattern) {
            try {
                logFile = await this.fs.getLatestFileInDirectoryByPattern(file, logFileName)
            } catch {
                logFile = file + "/" + logFileName
            }
        } else {
            logFile = file + "/" + logFileName
        }

        if (logFile !== previousLogFile) {
            if (this.debugMode)
                console.log("File changed to " + logFile)
            this.liveLogStartingPosition = 0;
            this.consumer = null;
            let logStartDate = game.fileStartDate(file) // This is for SWTOR only. The filename establishes what date the log was recorded on.
 			if (logStartDate)
 				await this.ipc.ipcSetStartDate(logStartDate) // Make sure the parser also knows the start date
            if (game.liveLoggingMustIncludeEntireFile() && !previousLogFile) {
                const liveStartTime = new Date().getTime()
                if (this.debugMode)
                    console.log("The live start time is " + liveStartTime)
                if (liveLogEntireFile !== "1")
                    await this.ipc.ipcSetLiveLoggingStartTime(liveStartTime) // Give the parser the live logging start time.
            }
        }

        let fileStats
        try {
            fileStats = await this.fs.getFileInfo(logFile)
        } catch (e) {}

        const logFileExists = fileStats && (fileStats.status === "success" || fileStats.size)
        const logFileSize = logFileExists ? fileStats.size : 0
        const checkLastModified = game.liveLoggingChecksLastModified()

        let liveLogPosition = 0
        if (!this.consumer) {
            if (!this.liveLogStartingPosition)
               this.liveLogStartingPosition = (game.liveLoggingMustIncludeEntireFile() ? 0 : logFileSize);
            liveLogPosition = this.liveLogStartingPosition;
        } else
            liveLogPosition = this.consumer.getLiveLogPosition();
        
        const { liveLogLastSize, debugMode, liveLogLastModified  } = this

        if (!logFileExists 
            || (checkLastModified && fileStats.lastWriteTime == liveLogLastModified)
            || (!checkLastModified && logFileSize == liveLogLastSize)
            || liveLogPosition >= logFileSize) {

            if (debugMode) {
                const msg = "No changes encountered. Our position is " + liveLogPosition + " and the file's size is " + logFileSize + "."
                logToDebugPanel(msg)
            }

            // If no changes after 120 seconds
            if (++this.unchangedCount === 24) { // 120 seconds more or less.
                const fights = await this.ipc.ipcCollectFightsFromParser(true, false)
                if (fights == null) {
                    // Stale
                    return
                }

                if (this.consumer) {
                    this.consumer.setCollectedFights(fights)
                }

                if (fights.length) {
                    setProgressStatusText(trans("assuming_combat_over"), "livelog-progress-status")
                    if (this.consumer) {
                        this.currentTimeout = setTimeout(async () => await this.consumer.compressReport(), 0)
                    }
                    return
                }
            }

            this.currentTimeout = setTimeout(async () => await this.checkForLiveLogChanges(file, logFile, selectedRegion, liveLogEntireFile), liveLogChangeInterval)
            return            
        }

        this.unchangedCount = 0

        this.liveLogLastModified = fileStats.lastWriteTime
        this.liveLogLastSize = logFileSize
    
        if (debugMode) {
            logToDebugPanel("File changed! Our position is " + liveLogPosition + " and the file's size is " + fileStats.size + ".")
        }
    
        this.fileBuffer = new LargeAsyncFileReader(game.logFileEncoding())
        await this.fileBuffer.openAsync(logFile, liveLogPosition)
    
        setProgressStatusText(trans("reading_new_log_data"), "livelog-progress-status")
        const consumer = this.consumer || new ChunkConsumer(
            this,
            game, 
            this.createBaseUrl(), 
            file, 
            this.reportCode,
            this.ipc,
            true,
            undefined,
            undefined,
            undefined,
            selectedRegion
        )
        if (!this.consumer) {
            // initialize consumer if it doesn't exist yet
            this.consumer = consumer
            consumer.setOnCheckLiveLogForChanges( async () => {
                this.currentTimeout = setTimeout(async () => await this.checkForLiveLogChanges(file, logFile, selectedRegion, liveLogEntireFile), liveLogChangeInterval)
            })
            const { onFatalError } = this
            consumer.setOnFatalError(onFatalError)
        }
        consumer.setLogStream(this.fileBuffer)
        this.currentTimeout = setTimeout(async () => await consumer.readFileChunk(), 0)
    }

    async splitLogFile(filePath, selectedRegion) {
        const baseUrl = this.createBaseUrl()
        await this.openFile(baseUrl, "", filePath, true, undefined, undefined, selectedRegion)
    }

    async liveLog(reportMeta, dir, selectedRegion, liveLogEntireFile) {
        const baseUrl = this.createBaseUrl()
        
        try {
            this.reportCode = await this.createReport(baseUrl, reportMeta);
            this.liveLogging = true;
            setProgressStatusText(trans("livelog_started"), 'livelog-progress-status');
            this.currentTimeout = setTimeout(async () => await this.checkForLiveLogChanges(dir, undefined, selectedRegion, liveLogEntireFile), 0)
        } catch (e) {
            console.log("ERROR", e)
            setErrorText("Invalid file.")
        }
    }

    async scanLogFileForRaids(reportMeta, filePath, selectedRegion) {
        const fileError = await this.checkFileForErrors(filePath)
        if (!fileError.isSuccess) {
            selectReportPage('upload')
            this.onFatalError(fileError.error)
            return
        }

        const baseUrl = this.createBaseUrl()
        setProgressStatusText(trans("scanning_log_file"), "logfile-progress-status")
        updateProgress(0, "logfile-progress")
        selectReportPage("progress")

        await this.openFile(baseUrl, "", filePath, false, true, undefined, selectedRegion)
    }

    async upload(reportMeta, file, raidsToUpload, selectedRegion) {
        const fileError = await this.checkFileForErrors(file)
        if (!fileError.isSuccess) {
            selectReportPage('upload')
            this.onFatalError(fileError.error)
            return
        }

        const baseUrl = this.createBaseUrl()
        
        try {
            const reportCode = await this.createReport(baseUrl, reportMeta)
            this.reportCode = reportCode
            await this.openFile(baseUrl, reportCode, file, false, false, raidsToUpload, selectedRegion)
        } catch (e) {
            console.log("ERROR", e)
            selectReportPage('upload')
            this.onFatalError(trans("invalid_file_selected_error"))
        }
    }

    async checkFileForErrors(filePath) {
        const exists = filePath && await this.fs.existsSync(filePath)
        const fileInfo = exists ? await this.fs.getFileInfo(filePath) : undefined;
        if (!exists || !fileInfo) {
            return {
                isSuccess: false,
                error: trans("invalid_file_selected_error")
            }
        }

        if (fileInfo.size > 1_500_000_000) {
            return {
                isSuccess: false,
                error: trans("file_too_large_error")
            }
        }

        return {
            isSuccess: true
        }
    }

    setCurrentTimeout(timeout) {
        this.currentTimeout = timeout
    }

    clearCurrentTimeout() {
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout)
        }
    }

    clearCollectedFights() {
        if (this.consumer)
            this.consumer.clearCollectedFights()
    }
}

return Uploader         
}
})