define(
    [
      "../3rdparty/overwolfplugin.js",
    ],
    function () {
      class FileStream {

        constructor(filePath) {
            this.filePath = filePath
            this.id = `${Date.now}`     
            
            this.init = this.init.bind(this)
            this.write = this.write.bind(this)
            this.close = this.close.bind(this)
        }

        init() {
            this.plugin = new OverwolfPlugin("simple-io-plugin", true)
            return new Promise((resolve, reject) => {
                this.plugin.initialize( (status) => {
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

        write(line) {
            return new Promise((resolve, reject) => {
                this.plugin.get().writeLine(this.id, line, e => {
                    // todo err?
                    resolve()
                })
            })
        }

        writeLines(lines) {
          return new Promise((resolve, reject) => {
            const data = lines.join('\n') + '\n';
            this.plugin.get().write(this.id, data, e => {
              // todo err?
              resolve()
            })
          })
        }

        close() {
            return new Promise((resolve, reject) => {
                this.plugin.get().closeFile(this.id, e => {
                    this.plugin.get().Dispose()
                    // todo err?
                    resolve()
                })
            })
        }
      }
  
      return FileStream;
    }
  )
  
  