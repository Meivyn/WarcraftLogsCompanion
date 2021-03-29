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

  // BEGIN
  // END

return BackgroundController;
});
