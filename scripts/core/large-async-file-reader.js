define(
    [
        "../3rdparty/overwolfplugin.js"
    ],
    function () {
        class LargeAsyncFileReader {
            constructor(encoding) {
                this._encoding = encoding;
                this.currentPosition = 0
                this.ready = false
                this.index = 0
                this.chunkCounter
                this.bufferSize = 8388608
                this.startTs = new Date().getTime()
                this.id = `${this.startTs}`

                this.initPlugin = this.initPlugin.bind(this)
                if (this.debug)
                    console.log("***** CREATED LARGE FILE READER *****")
            }

            static lengthInUtf8Bytes(str) {
                return (new TextEncoder().encode(str)).length
            }

            async initPlugin() {
                this.plugin = new OverwolfPlugin("simple-io-plugin", true)
                return new Promise((resolve, reject) => {
                    this.plugin.initialize( (status) => {
                        if (this.debug)
                            console.log("Overwolf plugin initialized: ", status)
                        status ? resolve() : reject()
                    })
                })
            }

            async openAsync(file, startingIndex = 0) {
                await this.initPlugin()
                this.startingIndex = startingIndex
                this.filePath = file
                this.start = startingIndex
                return new Promise((resolve, reject) => {
                    this.plugin.get().getFileInfo(file, result => {
                        const { size } = result
                        console.log(result)
                        if (result.status === "error") {
                            reject(result)
                        }
                        this.fileSize = size
                        this.currentPosition = this.start
                        this.ready = true

                        resolve()
                    })
                })
            }

            position() {
                return this.currentPosition
            }

            bytesAvailable() {
                if (this.complete) {
                    return 0
                }

                return this.fileSize - this.currentPosition
            }

            file() {
                return {
                    size: this.fileSize
                }
            }

            close() {
                this.complete = false
                this.currentPosition = 0
                if (this.plugin)
                    this.plugin.get().Dispose()
            }
           
            processHunk(hunk) {
                // bucket hunks into chunks of 5000 lines
                const chunks = []
                let chunk = null
                for (let i = 0; i < hunk.length; i++) {
                    const next = hunk[i]
                    if (!chunk || chunk.length >= 5000) {
                        // new chunk
                        chunk = []
                        chunks.push(chunk)
                    }
                    chunk.push(next)
                }

                return chunks
            }

            readChunk() {
                if (this.complete) {
                  if (this.debug) {
                    console.log("... done!");
                  }
                  return [];
                }

                return new Promise((resolve, reject) => {
                    let bufferSizeToUse = this.bufferSize * 2;
                    this.plugin.get().readFile(
                      this.id,
                      this.filePath,
                      this.currentPosition,
                      bufferSizeToUse,
                      (id, status, data, extraData) => {
                        if (!status) {
                            reject('An error has occurred while reading the file');
                        }
                        
                        var extra = JSON.parse(extraData)
                        
                        this.chunkCounter++;
                        this.currentPosition = extra.position

                        if (extra.eof)
                            this.complete = true
 
                        const unchunkedLines = data.split(/\r\n|\n|\r/);                        
                        const extractedLines = this.processHunk(unchunkedLines);
                       
                        if (this.debug) {
                          console.log("-----", this.chunkCounter, "-------");
                          console.log("extracted lines", extractedLines.length);
                          console.log("position", this.position());
                          console.log("bytesAvailable", this.bytesAvailable());
                          console.log("file", this.file().size);
                        }
                        
                        resolve(extractedLines);
                    });
                });
            }
        }

        return LargeAsyncFileReader
    }
)