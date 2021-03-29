define(
    [
        "../3rdparty/overwolfplugin.js",
    ],
    function(
    ) {        
        class zip {
            constructor() {
                this.archive = new JSZip()
            }

            async file(fileName, stringContent) {
                this.fileName = fileName
                this.archive.file(fileName, stringContent);
            }

            async write() {
                return this.archive.generateAsync({
                    type:"blob", 
                    compression: "DEFLATE", 
                    compressionOptions: { level: 9 },
                })
                .then(function (blob) {
                    return blob
                });
            }
        }

        return zip
    }
)