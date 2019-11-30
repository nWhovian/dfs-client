<template>
  <div>
    <button v-on:click="init()">Init</button>
    <br>
    <div>
      Upload a file
      <br>
      <input type="file" ref="file" placeholder="upload a file">
      <br>
      <label>
        Path to the file:
        <input type="text" v-model="directory" placeholder="/directory1/directory2">
        File name:
        <input type="text" v-model="name" placeholder="file">
      </label>
      <br>
      <button v-on:click="uploadFile()">upload file</button>
    </div>
    <br>
    <div>
      Download a file
      <input type="text" v-model="downloadfileName" placeholder="absolute name">
      <button v-on:click="downloadFile()">download file</button>
    </div>
    <br>
    <div>
      Delete a file
      <input type="text" v-model="deleteFileName" placeholder="absolute name">
      <button v-on:click="deleteFile()">delete file</button>
    </div>
    <br>
    <div>
      Get information about a file
      <input type="text" v-model="getInfoFileName" placeholder="absolute name">
      <button v-on:click="getFileInfo()">get info</button>
    </div>
    <br>
    <div>
      Copy a file
      <input type="text" v-model="copyFromFileName" placeholder="absolute name">
      <br>
      as:
      <input type="text" v-model="copyToFileName" placeholder="absolute name">
      <br>
      <button v-on:click="copyFile()">copy file</button>
    </div>
    <br>
    <div>
      Move a file
      from:
      <input type="text" v-model="moveFromFileName" placeholder="absolute name">
      <br>
      to:
      <input type="text" v-model="moveToFileName" placeholder="absolute name">
      <br>
      <button v-on:click="moveFile()">move file</button>
    </div>
    <br>
    <br>
    <div>
      Move to another directory ('cd' command)
      <input type="text" :placeholder="currentPath" v-model="cdDirectory">
      <button v-on:click="cdRequest()">move to directory</button>
    </div>
    <br>
    <div>
      List all files and directories ('ls' command)
      <br>
      Current directory: {{currentPath}}
      <br>
      Look in another directory (optional):
      <input type="text" v-model="lsDirectory">
      <br>
      <button v-on:click="lsRequest()">list</button>
    </div>
    <br>
    <div>
      Make a directory
      <input type="text" placeholder="absolute name of a directory" v-model="mkDirectory">
      <button v-on:click="mkdirRequest()">make directory</button>
    </div>
    <br>
    <div>
      Delete a directory
      <input type="text" placeholder="absolute name of a directory" v-model="delDirectory">
      <button v-on:click="delDirRequest()">delete directory</button>
    </div>
  </div>
</template>

<script>
  export default {
    name: "MainPage",
    data() {
      return {
        chunkSize: 1 * 1024,
        currentPath:"/",
        directory: "",
        name: "",
        datanodeIP: "",
        fileStorage: {},
        downloadfileName: "",
        deleteFileName: "",
        getInfoFileName:"",
        copyFromFileName:"",
        copyToFileName:"",
        moveFromFileName:"",
        moveToFileName:"",
        datanodeIPsList: {},
        lsDirectory: "",
        cdDirectory: "",
        mkDirectory:"",
        lsList: {},
        delDirectory: "",
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
        const fileName = this.downloadfileName;
        await this.getDatanodeToDownload(fileName);
        let i = 0;

        let reqUrl = "http://" + "10.91.91.190:5000" + "/download";
        console.log(reqUrl);
        let result = this.downloadRequest(fileName, reqUrl);
        console.log("result of download", result);
        i++;
      },
      deleteFile() {
        const fileName = this.deleteFileName;

        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", "http://10.91.86.17:5000/delete_file");
          xhr.setRequestHeader("File-Name", fileName);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
              console.log("deleted!");
              resolve();
            }
          };
          xhr.onerror = reject;
          xhr.send(null);
        });
      },
      getFileInfo() {
        const fileName = this.getInfoFileName;

        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", "http://10.91.86.17:5000/info");
          xhr.setRequestHeader("File-Name", fileName);
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
      copyFile() {
        const fileName1 = this.copyFromFileName;
        const fileName2 = this.copyToFileName;

        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", "http://10.91.86.17:5000/copy");
          xhr.setRequestHeader("File-Name-Old", fileName1);
          xhr.setRequestHeader("File-Name-New", fileName2);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
              resolve();
            }
          };
          xhr.onerror = reject;
          xhr.send(null);
        });
      },
      moveFile() {
        const fileName1 = this.moveFromFileName;
        const fileName2 = this.moveToFileName;

        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", "http://10.91.86.17:5000/move");
          xhr.setRequestHeader("File-Name-Old", fileName1);
          xhr.setRequestHeader("File-Name-New", fileName2);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
              resolve();
            }
          };
          xhr.onerror = reject;
          xhr.send(null);
        });
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
      lsRequest() {
        const directory = this.lsDirectory;
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", "http://10.91.86.17:5000/ls");
          xhr.setRequestHeader("Directory", directory);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
              this.lsList = xhr.response;
              console.log(this.lsList);
              resolve();
            }
          };
          xhr.onerror = reject;
          xhr.send(null);
        });
      },
      mkdirRequest(){
        const directory = this.mkDirectory;
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", "http://10.91.86.17:5000/mkdir");
          xhr.setRequestHeader("Directory", directory);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
              resolve();
            }
          };
          xhr.onerror = reject;
          xhr.send(null);
        });
      },
      delDirRequest(){
        const directory = this.delDirectory;
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", "http://10.91.86.17:5000/delete_dir");
          xhr.setRequestHeader("Directory", directory);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
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
