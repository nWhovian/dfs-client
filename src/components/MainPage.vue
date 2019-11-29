<template>
  <div>
    <input type="file" ref="file" placeholder="upload a file">
    <button v-on:click="uploadFile()">Upload a file</button>
  </div>
</template>

<script>
    export default {
        name: "MainPage",
        data() {
            return {
                chunkSize: 256
            }
        },
        created: {
        },
        methods: {
            uploadFile() {
                const file = this.$refs.file.files[0];
                console.log(file);

                const chunksNumber = Math.ceil(file.size / this.chunkSize);
                const chunksQueue = new Array(chunksNumber).fill().map((_, index) => index).reverse();

                while (!!chunksQueue.length && chunksQueue.length > 0) {
                    let chunkId = chunksQueue.pop();
                    console.log("Uploading chunk #" + chunkId + "...");

                    let begin = chunkId * this.chunkSize;
                    let currentChunk = file.slice(begin, begin + this.chunkSize);

                    this.uploadChunk(
                        chunkId.toString(),
                        currentChunk,
                        file.name.toString(),
                        "1",
                        file.size.toString()
                    )
                        .then(() => {
                            console.log("chunk #" + chunkId + " uploaded successfully");
                        })
                        .catch(() => {
                            console.log("chunk #" + chunkId + " uploading failed");
                            chunksQueue.push(chunkId);
                        });
                }
                console.log("The file uploaded");
            },
            uploadChunk(
                chunkId,
                chunk,
                fileName,
                fileId,
                fileSize) {
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("POST", "/upload");

                    xhr.setRequestHeader("Content-Type", "application/octet-stream");
                    xhr.setRequestHeader("Chunk-Id", chunkId);
                    xhr.setRequestHeader("Chunk-Length", chunk.size.toString());
                    xhr.setRequestHeader("File-Name", fileName);
                    xhr.setRequestHeader("File-Id", fileId);
                    xhr.setRequestHeader("File-Length", fileSize);

                    xhr.onreadystatechange = () => {
                        if (xhr.readyState === 4 && xhr.status === 200) {
                            resolve();
                        }
                    };
                    xhr.onerror = reject;
                    xhr.send(chunk);
                });
            }
        }
    }
</script>

<style scoped>

</style>
