define(
    function () {
    return function (
        ZipFile,
        UIDelegate,
        FileStream,
        FS,
    ) {
         

    const {
        trans,
        setErrorText,
        logToDebugPanel,
        setStatusText,
        updateProgress,
        setProgressStatusText,
        setUploadProgressContainer,
        setCancelButtonVisible,
        showFightSelectionUI
    } = UIDelegate

    const doArchivaUI = () => console.log("doArchivaUI ** NOT IMPLEMENTED")
    const fileDebugger = { log: (txt) => 
        console.debug("LOG: ", txt)
    }

    const countLines = (linesChunk, stopIndex) => {
        let result = 0
        for (let i = 0; i < stopIndex; ++i)
            result += linesChunk[i].length
        return result
    }

    const path = {
        resolve: (p) => {
            // noop for now
            return p
        }
    }

    const escapedISOString = (date) => {
        const result = date.toISOString()
        const replacedResult = result.replace(/:/g, "-")
        return replacedResult
    }

    class ChunkConsumer {
        constructor(
            uploader,
            game, 
            baseUrl, 
            file, 
            reportCode, 
            ipc, 
            liveLogging, 
            splittingLogFile,
            scanningLogFileForRaids,
            raidsToUpload,
            selectedRegion
        ) {
            this.id = `${new Date().getTime()}`
            this.uploader = uploader
            this.game = game
            this.ipc = ipc
            this.file = file
            this.reportCode = reportCode
            this.baseUrl = baseUrl

            this.previousTimestampForSplit = 0
            this.isLogValid = false
            this.splittingLogFile = splittingLogFile
            this.scanningLogFileForRaids = scanningLogFileForRaids
            this.debugMode = false
            this.liveLogPosition = 0
            this.collectedFights = {
                fights: new Array(),
            }
            this.collectedScannedRaids = new Array()
            this.liveLogging = liveLogging
            this.liveLogChangeInterval = 5000
            this.terminateLogging = false
            this.currentLinesIndex = 0
            this.userCanceled = false
            this.raidsToUpload = raidsToUpload
            this.selectedRegion = selectedRegion

            this.compressReport = this.compressReport.bind(this)
            this.uploadMasterReportTable = this.uploadMasterReportTable.bind(this)
            this.doMasterTableComplete = this.doMasterTableComplete.bind(this)
            this.readFileChunk = this.readFileChunk.bind(this)
            this.compressReportSegment = this.compressReportSegment.bind(this)
            this.uploadReportSegment = this.uploadReportSegment.bind(this)
            this.doChunkComplete = this.doChunkComplete.bind(this)
            this.doProgress = this.doProgress.bind(this)
            this.doError = this.doError.bind(this)
            this.handleLogTermination = this.handleLogTermination.bind(this)
            this.terminateReport = this.terminateReport.bind(this)
            this.doTerminateComplete = this.doTerminateComplete.bind(this)
            this.cancelUploadOrLiveLog = this.cancelUploadOrLiveLog.bind(this)
            this.setOnCheckLiveLogForChanges = this.setOnCheckLiveLogForChanges.bind(this)
            this.setOnChunkComplete = this.setOnChunkComplete.bind(this)
            this.checkForLiveLogChanges = this.checkForLiveLogChanges.bind(this)
            this.getLiveLogPosition = this.getLiveLogPosition.bind(this)
            this.setCollectedFights = this.setCollectedFights.bind(this)
            this.createNewSplitFile = this.createNewSplitFile.bind(this)
            this.setOnFatalError = this.setOnFatalError.bind(this)
            this.getFs = this.getFs.bind(this)
        }
        
        async getFs() { 
            if (!this.fs) {
                this.fs = new FS()
                await this.fs.init()
            }
            return this.fs
        }

        setLogStream(logStream) {
            this.logStream = logStream
        }

        setOnChunkComplete(onChunkComplete) {
            this.onChunkComplete = onChunkComplete
        }

        setOnCheckLiveLogForChanges(onCheckLiveLogForChanges) {
            this.onCheckLiveLogForChanges = onCheckLiveLogForChanges
        }

        setOnFatalError(onFatalError) {
            this.onFatalError = onFatalError
        }

        setCollectedFights(fights) {
            this.collectedFights = fights
        }

        clearCollectedFights() {
            this.collectedFights = { fights: new Array() }
        }

        getLiveLogPosition() {
            return this.liveLogPosition
        }

        async createNewSplitFile() {
            let { splitFileStream, splitFileTimestamp, file } = this
            splitFileStream && (splitFileStream.close(), splitFileStream = null);

            const fs = await this.getFs();

            let e, t = file, i = t.lastIndexOf("."), o = i > -1, r = "";
            o ? (e = t.substring(0, i), r = t.substring(i)) : e = t;

            const l = fs.dirName(file);
            const fileName = "Split" + e.split(fs.separator()).pop()
            const splitFile = l + fs.separator() + fileName + "-" + escapedISOString(new Date(splitFileTimestamp)) + r

            console.log("The file is " + splitFile);

            this.splitFileStream = new FileStream(splitFile)
            await this.splitFileStream.init()
        }

        async handleLogTermination() {
            this.userCanceled = true

            const { liveLogging, splittingLogFile } = this
            if (liveLogging || splittingLogFile) {
                await this.handleLogDeletionAndArchival()
                return
            }

            setProgressStatusText(trans("cleaning_up"), "upload-progress-status")
            updateProgress(0, "upload-progress")
            this.uploader.setCurrentTimeout(setTimeout(async () => await this.terminateReport(), 0))
        }

        async handleLogDeletionAndArchival() {
            const { liveLogging, game, file } = this

            const wasLiveLogging = liveLogging
            await this.cancelOrFinish('deletion-archival')

            let fileForDeletionAndArchival = file
            if (wasLiveLogging) {
                await this.getFs()

                const logFileName = game.logFileName()
                const logFileNameIsSearchPattern = logFileName.includes('?') || logFileName.includes('*')

                const logFile = logFileNameIsSearchPattern
                    ? await this.fs.getLatestFileInDirectoryByPattern(fileForDeletionAndArchival, logFileName)
                    : fileForDeletionAndArchival + "/" + game.logFileName()

                if (!logFile) {
                    return
                }
                const doesExists = await this.fs.existsSync(logFile)
                if (!doesExists) {
                    return
                }
                fileForDeletionAndArchival = logFile
            }

            UIDelegate.handleLogDeletionAndArchival(fileForDeletionAndArchival)
        }

        async terminateReport() {
            const url = this.baseUrl + "/client/terminate-log/" + this.reportCode
            this.uploader.setCurrentTimeout(0)

            axios.get(url)
                .then(async (response) => {
                    // handle success
                    console.log(response);
                    await this.doTerminateComplete(response);
                })
                .catch(function (error) {
                    // handle error
                    console.log(error);
                })
        }

        async doTerminateComplete(e) {
            if (e.data.substring(0, 7) == "Success") {
                updateProgress(100, "upload-progress")
                setStatusText(trans("cleanup_success"));
                await this.handleLogDeletionAndArchival()
            } else {
                await this.cancelOrFinish('upload')
                setErrorText(e.data)
            }
        }

        checkForUserCancelation() {
            return this.userCanceled
        }

        async cancelUploadOrLiveLog() {
            // Stop any timeouts from firing. Note we also have to check for a cancelation in all the places
            // where awaits are happening, e.g., other IPC calls or waiting on zip files to complete zip operations.
            this.uploader.clearCurrentTimeout()
            this.userCanceled = true
            await this.cancelOrFinish('upload')
        }

        async cancelOrFinish(reportPage) {
            const {
                uploader,
                logStream,
                splitFileStream,
            } = this

            // Do this first in order to make an IPC call. This ensures the parser is done with
            // an ipcParseLogLines call before we can get through.
            const result = await this.finishChunk()
            if (!result) {
                return
            }

            this.uploader.clearCurrentTimeout();

            UIDelegate.cancelOrFinish(reportPage)

            this.isLogValid = false

            const parserClearResult = await this.ipc.ipcClearParserState()
            if (!parserClearResult)
                return

            this.ipc.ipcIncrementCurrent()

            this.liveLogging = false
            this.liveLogPosition = 0
            this.liveLogLastModified = 0
            this.liveLogLastSize = 0
            this.lastCombatEventTime = 0
            this.terminateLogging = false

            this.unchangedCount = 0
            this.reportCode = ''

            this.splittingLogFile = false
            this.splitFileTimestamp = 0
            this.previousTimestampForSplit = 0
            this.daylightSavingsSplitShift = 0
            this.splitZoneID = 0
            this.splitYearSet = false
            this.splitYear = 0
            this.previousSplitTime = 0

            this.scanningLogFileForRaids = false
            this.collectedScannedRaids = new Array()
            this.raidsToUpload = new Array()

            if (logStream) {
                logStream.close()
                this.logStream = null
            }

            if (splitFileStream) {
                splitFileStream.close()
                this.splitFileStream = null
            }
        }

        async finishChunk() {
            this.currentLinesIndex = 0
            this.linesChunk = null
            this.lineCount = 0

            this.deleteTempFile()

            return await this.ipc.ipcClearParserFights()
        }

        async doChunkComplete(e) {
            if (this.checkForUserCancelation())
                return
            if (e.data == "Success") {
                updateProgress(100, "upload-progress")
                setUploadProgressContainer(false)
                if (this.liveLogging) {
                    setProgressStatusText(trans("waiting_for_data"), "livelog-progress-status")
                } else
                    setProgressStatusText(trans("reading_log_file"), "logfile-progress-status")

                await this.finishChunk()

                if (this.terminateLogging) {
                    await this.handleLogTermination()
                } else if (!this.liveLogging || this.logStream)
                    this.uploader.setCurrentTimeout(setTimeout(async () => await this.readFileChunk(), 0))
                else
                    this.uploader.setCurrentTimeout(setTimeout(async () => await this.checkForLiveLogChanges(), this.liveLogChangeInterval))
            } else {
                this.cancelOrFinish('upload').then((value) => { setErrorText(e.data) });
            }
        }

        doProgress(e) {
            const loaded = e.bytesLoaded
            const total = e.bytesTotal
            const percentLoaded = Math.ceil((loaded / total) * 100)
            updateProgress(percentLoaded, "upload-progress")
        }

        doError() {
            if (this.checkForUserCancelation())
                return
            cancelUploadOrLiveLog().then((value) => {
                setErrorText(trans("upload_error"))
            });
        }

        async uploadMasterReportTable() {
            fileDebugger.log("**** ----> uploadMasterReportTable")
            const { UPLOAD_COMPLETE_DATA, PROGRESS, ERROR } = ZipFile.events()
            this.uploader.setCurrentTimeout(0)

            const { tempFile } = this
            tempFile.addEventListener(UPLOAD_COMPLETE_DATA, async (e) => await this.doMasterTableComplete(e))
            tempFile.addEventListener(PROGRESS, this.doProgress)
            tempFile.addEventListener(ERROR, this.doError)

            const url = this.baseUrl + "/client/set-master-table/"

            // SETTINGS FOR THE REQUEST
            // todo - we need to set this in the request? in ZipFile?
            // request.cacheResponse = false
            const vars = {
                report: this.reportCode
            }

            // UPLOAD THE FILE, DON'T TEST THE SERVER BEFOREHAND
            // todo -- what is this parameter 'logfile' for???
            // tempFile.upload(request, 'logfile', false)
            tempFile.upload(url, vars)
        }

        deleteTempFile() {
            if (this.tempFile) {
                this.tempFile.cancel() // Stop the upload.
                this.tempFile.deleteFile()
                this.tempFile = null
            }
        }

        async doMasterTableComplete(e) {
            if (this.checkForUserCancelation())
                return
            if (e.data.substring(0, 7) == "Success") {
                fileDebugger.log("**** ----> doMasterTableComplete Success")
                updateProgress(100, "upload-progress")
                setStatusText(trans("upload_chunk_success"));
                this.uploader.setCurrentTimeout(setTimeout(async () => await this.compressReportSegment(), 0));
            } else {
                this.cancelOrFinish('upload').then((value) => {
                    setErrorText(e.data)
                });
            }

        }

        async uploadReportSegment() {
            fileDebugger.log("**** ----> uploadReportSegment")
            const { UPLOAD_COMPLETE_DATA, PROGRESS, ERROR } = ZipFile.events()
            this.uploader.setCurrentTimeout(0)

            const { collectedFights, tempFile } = this
            tempFile.addEventListener(UPLOAD_COMPLETE_DATA, async (e) => await this.doChunkComplete(e))
            tempFile.addEventListener(PROGRESS, this.doProgress)
            tempFile.addEventListener(ERROR, this.doError)

            const url = this.baseUrl + "/client/add-to-log/"

            // SETTINGS FOR THE REQUEST
            // todo - we need to set this in the request? in ZipFile?
            // request.cacheResponse = false

            // SOME VARIABLES (E.G. A FOLDER NAME TO SAVE THE FILE)
            const vars = {
                report: this.reportCode,
                start: collectedFights.startTime,
                end: collectedFights.endTime,
                mythic: collectedFights.mythic,
                livelog: this.liveLogging ? 1 : 0,
            }

            // UPLOAD THE FILE, DON'T TEST THE SERVER BEFOREHAND
            // todo -- what is this parameter 'logfile' for???
            // tempFile.upload(request, 'logfile', false)
            tempFile.upload(url, vars)
        }

        async compressReportSegment() {
            fileDebugger.log("**** ----> compressReportSegment")
            this.uploader.setCurrentTimeout(0)
            const { collectedFights, tempFile } = this
            if (!collectedFights.fights.length) {
                return
            }

            // First, we upload the master file that contains all actors, abilities and tuples.
            let fileString = ''
            fileString += collectedFights.logVersion
                + '|' + collectedFights.gameVersion
                + "\n"; // Version. Revs any time we change the file format.

            // Stitch the events back together into one chunk.
            let eventCount = 0
            let eventCombinedString = ''
            for (let i = 0; i < collectedFights.fights.length; ++i) {
                let fight = collectedFights.fights[i]
                eventCount += fight.eventCount
                eventCombinedString += fight.eventsString
            }

            fileString += eventCount + "\n"
            fileString += eventCombinedString

            // The next step is zipping up the events file.
            await tempFile.addFileFromString("log.txt", fileString)
            await tempFile.finalize(() => {
                if (this.checkForUserCancelation() || this.tempFile !== tempFile)
                    return
                fileDebugger.log("------------------")
                fileDebugger.log("INSIDE THE SEGMENT:")
                fileDebugger.log("------------------")
                // fileDebugger.log(fileString)
                setProgressStatusText(trans("uploading_new_fights"), "upload-progress-status")
                updateProgress(0, "upload-progress")
                this.uploader.setCurrentTimeout(setTimeout(async () => await this.uploadReportSegment(), 0))
            })
        }

        async compressReport() {
            fileDebugger.log("**** ----> compressReport")
            this.uploader.setCurrentTimeout(0)
            this.userCanceled = false
            const { collectedFights } = this
            if (!collectedFights.fights.length) {
                return
            }

            // First, we upload the master file that contains all actors, abilities and tuples.
            let fileString = ''
            fileString += collectedFights.logVersion
                + '|' + collectedFights.gameVersion
                + "\n"; // Version. Revs any time we change the file format.

            const masterFile = await this.ipc.ipcCollectMasterFileInfo()
            if (!masterFile) {
                return
            }

            fileString += masterFile.lastAssignedActorID + "\n"
            fileString += masterFile.actorsString

            fileString += masterFile.lastAssignedAbilityID + "\n"
            fileString += masterFile.abilitiesString

            fileString += masterFile.lastAssignedTupleID + "\n"
            fileString += masterFile.tuplesString

            fileString += masterFile.lastAssignedPetID + "\n"
            fileString += masterFile.petsString

            // The next step is zipping up the tuples file.

            fileDebugger.log("------------------")
            fileDebugger.log("INSIDE THE MASTER:")
            fileDebugger.log("------------------")
            // fileDebugger.log(fileString)

            const tempFile = new ZipFile()
            this.tempFile = tempFile
            await tempFile.addFileFromString('log.txt', fileString)
            await tempFile.finalize(async () => {
                if (this.checkForUserCancelation() || tempFile !== this.tempFile)
                    return

                setProgressStatusText(trans("uploading_new_actors"), "upload-progress-status")

                setUploadProgressContainer(true)

                updateProgress(0, "upload-progress")
                this.uploader.setCurrentTimeout(setTimeout(async () => await this.uploadMasterReportTable(), 0))
            })
        }

        async checkForLiveLogChanges() {
            const { onCheckLiveLogForChanges } = this
            if (onCheckLiveLogForChanges) {
                await onCheckLiveLogForChanges()
            }
        }

        async stopLiveLoggingSession() {
            this.uploader.clearCurrentTimeout(); // Kills all timers and the ability to check for more changes
            this.deleteTempFile(); // Kills uploading and zip finalization, since zip finalize does a compare with the current temp file.

            const fights = await this.ipc.ipcCollectFightsFromParser(true, false)
            if (!fights)
                return

            this.collectedFights = fights
            if (this.collectedFights.fights.length) {
                this.terminateLogging = true
                setProgressStatusText(trans("uploading_remaining"), "livelog-progress-status")
                this.uploader.setCurrentTimeout(setTimeout(async () => await this.compressReport(), 0))
                return
            }

            await this.handleLogTermination()
        }

        async readFileChunk() {
            this.uploader.setCurrentTimeout(0)

            const {
                logStream,
                splittingLogFile,
                game,
                scanningLogFileForRaids,
                liveLogPosition,
                debugMode,
                splitFileTimestamp,
            } = this

            if (this.checkForUserCancelation())
                return

            if (debugMode) {
                logToDebugPanel("Entering readFileChunk with logStream position: " + logStream.position() + ".")
            }

            // mutable state in this function only
            let firstLineWasInvalid = false

            try {
                if (!this.linesChunk || !this.linesChunk.length) {
                    this.oldFilePosition = logStream.position()
                    this.linesChunk = await logStream.readChunk()
                }

                const lines = this.linesChunk.length ? this.linesChunk[this.currentLinesIndex] : null
                if (!this.isLogValid && lines && lines.length > 0) {
                    var { timestamp } = game.scanLogLine(lines[0])
                    if (timestamp == -1 && lines[0].trim().length) {
                        setErrorText('Line 1 - This is not a valid log file. Bad line was: ' + lines[0])
                        firstLineWasInvalid = true
                        this.isLogValid = false
                    } else {
                        this.isLogValid = true
                    }
                }

                if (!firstLineWasInvalid && lines) {
                    if (splittingLogFile) {
                        for (let i = 0; i < lines.length; ++i) {
                            const splitsOnTimestamp = game.splitsOnTimestamps()
                            const splitsOnZoneChange = game.splitsOnZoneChanges()
                            const oldZoneID = this.splitZoneID

                            const { timestamp, splitZoneID } = game.scanLogLine(lines[i]);
                            this.splitZoneID = splitZoneID || this.splitZoneID;

                            if (timestamp != -1) {
                                // -2 is a magic value that means force a split. ESO uses this when BEGIN_LOG is seen.   
                                if (timestamp == -2 || splitFileTimestamp == 0 || (splitsOnTimestamp && timestamp > this.previousTimestampForSplit + 60 * 1000 * 60 * 4) || (splitsOnZoneChange && oldZoneID && this.splitZoneID && this.splitZoneID != oldZoneID)) {
                                    if (this.linesToWriteToSplitFile?.length) {
                                        await this.flushSplitFileBuffer();
                                    }

                                    this.splitFileTimestamp = timestamp
                                    await this.createNewSplitFile()
                                }

                                this.addLineToSplitFileBuffer(lines[i]);

                                if (this.linesToWriteToSplitFile.length === 5000 || !logStream.bytesAvailable()) {
                                    await this.flushSplitFileBuffer();
                                }

                                this.previousTimestampForSplit = timestamp
                            }
                        }
                    } else {
                        // Parsing
                        const { raidsToUpload } = this
                        const answer = await this.ipc.ipcParseLogLines(lines, scanningLogFileForRaids, this.selectedRegion, raidsToUpload)
                        if (this.checkForUserCancelation())
                            return
                        if (!answer.success) {
                            if (answer.exception) {
                                setErrorText("Line " + answer.parsedLineCount + " - " + answer.exception + "-" + answer.line)
                            }
                            this.isLogValid = false
                            if (debugMode) {
                                logToDebugPanel(answer.exception)
                            }
                        }
                    }
                }

                /////////////////

                if (this.isLogValid
                    && !firstLineWasInvalid
                    && this.linesChunk
                    && this.linesChunk.length) {

                    this.currentLinesIndex++

                    if (this.currentLinesIndex < this.linesChunk.length) {
                        if (debugMode) {
                            logToDebugPanel("Line threshold of 5000 exceeded. Calling readFileChunk again.")
                        }
                        this.uploader.setCurrentTimeout(setTimeout(async () => await this.readFileChunk(), 0))

                        updateProgress(
                            Math.ceil(100 *
                                (this.oldFilePosition +
                                    (countLines(this.linesChunk, this.currentLinesIndex) / countLines(this.linesChunk, this.linesChunk.length)) *
                                    (logStream.position() - this.oldFilePosition) - liveLogPosition) / (logStream.file().size - liveLogPosition)),
                            "logfile-progress")
                        return
                    } else {
                        this.currentLinesIndex = 0
                    }
                }

                /////////////////

                if (this.isLogValid
                    && !firstLineWasInvalid
                    && logStream.bytesAvailable()
                ) {
                    if (debugMode) {
                        logToDebugPanel("More bytes are available. Our current position is " + logStream.position() + " and bytes available is " + logStream.bytesAvailable() + ".")
                    }
                    this.linesChunk = null
                    updateProgress(
                        Math.ceil(100 *
                            (logStream.position() - liveLogPosition) / (logStream.file().size - liveLogPosition)),
                        "logfile-progress")
                    const fights = await this.ipc.ipcCollectFightsFromParser(false, false)
                    if (fights == null) {
                        return // Stale
                    }
                    if (this.checkForUserCancelation())
                        return

                    this.collectedFights = fights
                    if (!this.collectedFights.fights.length) {
                        this.uploader.setCurrentTimeout(setTimeout(async () => await this.readFileChunk(), 0))
                    } else {
                        setProgressStatusText(
                            "Processed " + this.collectedFights.fights.length + " New Fights. Compressing Combat Log Data",
                            "livelog-progress-status")

                        this.uploader.setCurrentTimeout(setTimeout(async () => await this.compressReport(), 0))
                    }
                    return
                }
            } catch (e) {
                console.log("******** ERROR ********", e)
                setErrorText(e)
                this.isLogValid = false
                if (debugMode) {
                    logToDebugPanel(e)
                }
                const { onFatalError } = this
                if (onFatalError) {
                    onFatalError(e)
                }
            }

            /////////////////

            const position = logStream ? logStream.position() : 0
            if (debugMode) {
                logToDebugPanel("Finished readFileChunk with position of " + position + ".")
            }

            this.linesChunk = null
            if (logStream) {
                logStream.close()
                this.logStream = null
            }

            if (this.isLogValid) {
                if (this.liveLogging) {
                    this.liveLogPosition = position
                    if (debugMode) {
                        logToDebugPanel("Set live log position to " + position + ".")
                    }
                    const fights = await this.ipc.ipcCollectFightsFromParser(false, false)
                    if (fights == null) {
                        return // Stale
                    }
                    this.collectedFights = fights
                    if (!this.collectedFights.fights.length) {
                        this.uploader.setCurrentTimeout(setTimeout(async () => await this.checkForLiveLogChanges(), this.liveLogChangeInterval))
                        setProgressStatusText(trans("waiting_for_fight_end"), "livelog-progress-status")
                        return
                    }
                    setProgressStatusText(trans("processed_new_fights") + " " + trans("compressing_data"), "livelog-progress-status")
                } else {
                    const fights = await this.ipc.ipcCollectFightsFromParser(true, scanningLogFileForRaids)
                    if (fights == null) {
                        return // Stale
                    }
                    this.collectedFights = fights
                    this.terminateLogging = true
                    setProgressStatusText(trans("compressing_data"), "livelog-progress-status")
                }
                if (this.collectedFights.fights.length) {
                    this.uploader.setCurrentTimeout(setTimeout(async () => await this.compressReport(), 0))
                } else if (scanningLogFileForRaids) {
                    const raids = await this.ipc.ipcCollectScannedRaidsFromParser()
                    if (raids == null) {
                        return // Stale
                    }
                    this.collectedScannedRaids = raids
                    showFightSelectionUI(this.collectedScannedRaids, this.collectedFights.logVersion)

                } else {
                    await this.handleLogTermination()
                }
            } else {
                setCancelButtonVisible(false)
                const result = await this.ipc.ipcClearParserState()
                if (!result) {
                    return
                }
                doArchivaUI()
            }

        }

        addLineToSplitFileBuffer(line) {
            if (this.linesToWriteToSplitFile === undefined) {
                this.linesToWriteToSplitFile = [];
            }
            this.linesToWriteToSplitFile.push(line);
        }

        async flushSplitFileBuffer() {
            await this.splitFileStream.writeLines(this.linesToWriteToSplitFile);
            this.linesToWriteToSplitFile = [];
        }
    }

    return ChunkConsumer
          
}
})