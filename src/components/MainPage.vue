<template>
  <div>
    <button v-on:click="init()">Init</button>
    <div>
      <input type="file" ref="file" placeholder="upload a file">
      <label>
        Path to the file:
        <input type="text" v-model="directory" placeholder="/directory1/directory2">
        File name:
        <input type="text" v-model="name" placeholder="file">
      </label>
      <button v-on:click="uploadFile()">Upload a file</button>
    </div>
    <div>
      <input type="text" v-model="fileName" placeholder="file">
      <button v-on:click="downloadFile()">Download</button>
    </div>
  </div>
</template>

<script>
  export default {
    name: "MainPage",
    data() {
      return {
        chunkSize: 1 * 1024,
        directory: "",
        name: "",
        datanodeIP: "",
        fileStorage: {},
        fileName: "",
        datanodeIPsList: {}
      }
    },
    created: {},
    methods: {
      async uploadFile() {
        const file = this.$refs.file.files[0];
        const fileName = this.directory + "/" + this.name + "." + file.name.split('.').pop();
        // this.datanodeIP = "10.91.91.190:5000";

        await this.getDatanodeToUpload(fileName);

        const chunksNumber = Math.ceil(file.size / this.chunkSize);
        const chunksQueue = new Array(chunksNumber).fill().map((_, index) => index).reverse();
        while (!!chunksQueue.length && chunksQueue.length > 0) {
          let chunkId = chunksQueue.pop();
          console.log("Uploading chunk #" + chunkId + "...");
          let begin = chunkId * this.chunkSize;
          let currentChunk = file.slice(begin, begin + this.chunkSize);
          this.uploadChunk(
            this.datanodeIP,
            chunkId.toString(),
            currentChunk,
            chunksNumber,
            fileName,
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
      async downloadFile() {
        const fileName = this.fileName;
        await this.getDatanodeToDownload(fileName);
        let i = 0;

        let reqUrl = "http://" + this.datanodeIPsList[i] + "/download";
        let result = this.downloadRequest(fileName, reqUrl);
        console.log(result);
        i++;
      },
      init() {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", "http://10.91.86.17:5000/init");
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
              console.log(xhr.response);
              resolve();
            }
          };
          xhr.onerror = reject;
          xhr.send(null);
        });
      },
      uploadChunk(
        datanodeIP,
        chunkId,
        chunk,
        chunkNumber,
        fileName,
        fileId,
        fileSize) {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const url = "http://" + datanodeIP + "/upload";
          xhr.open("POST", url);
          xhr.setRequestHeader("Content-Type", "application/octet-stream");
          xhr.setRequestHeader("Chunk-Id", chunkId);
          xhr.setRequestHeader("Chunk-Number", chunkNumber);
          xhr.setRequestHeader("File-Name", fileName);
          xhr.setRequestHeader("File-Id", fileId);
          xhr.setRequestHeader("File-Length", fileSize);
          xhr.setRequestHeader("Replications", '3');
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
              resolve();
            }
          };
          xhr.onerror = reject;
          xhr.send(chunk);
        });
      },
      getDatanodeToUpload(fileName) {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", "http://10.91.86.17:5000/create");
          xhr.setRequestHeader("File-Name", fileName);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
              this.datanodeIP = xhr.response;
              console.log(this.datanodeIP);
              resolve();
            }
          };
          xhr.onerror = reject;
          xhr.send(null);
        });
      },
      getDatanodeToDownload(fileName) {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", "http://10.91.86.17:5000/read");
          xhr.setRequestHeader("File-Name", fileName);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
              this.datanodeIPsList = xhr.response;
              console.log(this.datanodeIPsList);
              resolve();
            }
          };
          xhr.onerror = reject;
          xhr.send(null);
        });
      },
      downloadRequest(fileName, reqUrl) {
        return new Promise((resolve, reject) => {
          const xhttp = new XMLHttpRequest();
          xhttp.open("GET", reqUrl);
          xhttp.setRequestHeader("File-Name", fileName);
          xhttp.responseType = 'blob';
          xhttp.onreadystatechange = function () {
            let a;
            if (xhttp.readyState === 4 && xhttp.status === 200) {
              a = document.createElement('a');
              let url = window.URL.createObjectURL(xhttp.response);
              a.href = url;
              a.download = fileName.split('/').pop();
              a.style.display = 'none';
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
              resolve();
            }
          };
          xhttp.onerror = reject;
          xhttp.send(null);
        });
      }
    }
  }
</script>

<style scoped>
</style>
