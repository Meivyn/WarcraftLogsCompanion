define(
    function() {
        const UIDelegate = {
            trans: (txt) => window.lang.trans(txt),
            setErrorText: (txt) => window.eventBus.trigger("setErrorText", txt),
            setWarningText: (txt) => window.eventBus.trigger("setWarningText", txt),
            logToDebugPanel: (txt) => console.log(txt),
            setStatusText: (txt) => {}, // noop per original
            updateProgress: (pct, id) => window.eventBus.trigger("updateProgress", { pct, id }),
            setProgressStatusText: (text, id) => window.eventBus.trigger("setProgressStatusText", { text, id }),
            setUploadProgressContainer: (b) => window.eventBus.trigger("setUploadProgressContainer", b),
            setCancelButtonVisible: (visible) => window.eventBus.trigger("setCancelButtonVisible", visible),
            selectReportPage: (page) => window.eventBus.trigger("selectReportPage", page),
            cancelOrFinish: (reportPage) => window.eventBus.trigger("cancelOrFinish", reportPage),
            handleLogDeletionAndArchival: (file) => window.eventBus.trigger("handleLogDeletionAndArchival", file),
            setLastReportCode: (reportCode) => window.eventBus.trigger("setLastReportCode", reportCode),  
            showFightSelectionUI: (collectedScannedRaids, logVersion) => window.eventBus.trigger("showFightSelectionUI", 
                {collectedScannedRaids, logVersion}),
            doneProcessing: () => window.doneProcessing()
        }
        
        return UIDelegate
    }
)
