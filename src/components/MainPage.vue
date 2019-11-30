<template>
  <div>
    <button v-on:click="init()">Init</button>
    <br>
    <div>
      Create an empty file
      <input type="text" v-model="createFileName" placeholder="absolute name">
      <button v-on:click="createFile()">create file</button>
    </div>
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
      <br>
      <a style="color:red;">{{downloadError}}</a>
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
      <br>
      <div v-if="fileInfo !== undefined && fileInfo.size !== undefined">
        <a>size of the file: <a style="color: red;">{{fileInfo.size}}</a></a>
        <br>
        <a>time of last access: <a style="color: red;">{{printDate(fileInfo.last_accessed)}}</a></a>
        <br>
        <a>time of last modification: <a style="color: red;">{{printDate(fileInfo.last_modified)}}</a></a>
      </div>
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
      <br>
      <a style="color:red;">{{cdError}}</a>
    </div>
    <br>
    <div>
      <a>Current directory: <a style="color: red;">{{currentPath}}</a></a>
      <br>
      List all files and directories ('ls' command)
      <br>
      Look in another directory (optional):
      <input type="text" v-model="lsDirectory">
      <br>
      <button v-on:click="lsRequest()">list</button>
      <br>
      <a v-for="(entity, i) in lsList" :key="i" :style="entity.color === 'true' ? 'color: red;' : 'color: blue;'">
        {{ entity.name }}
      </a>
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

    <div id="initModal" class="modal" :style="isInitOpen ? 'display: block;' : 'display: none;'">
      <div class="modal-content">
        <p>Please enter the namenode IP</p>
        <input type="text" v-model="namenodeIP">
        <button v-on:click="saveIP()">save</button>
      </div>

    </div>
  </div>
</template>

<script>
  export default {
    name: "MainPage",
    data() {
      return {
        isInitOpen: true,
        namenodeIP: "",
        chunkSize: 1 * 1024,
        currentPath: "/",
        directory: "",
        name: "",
        datanodeIP: "",
        fileStorage: {},
        downloadfileName: "",
        deleteFileName: "",
        getInfoFileName: "",
        copyFromFileName: "",
        copyToFileName: "",
        moveFromFileName: "",
        moveToFileName: "",
        createFileName: "",
        datanodeIPsList: {},
        lsDirectory: "",
        cdDirectory: "",
        mkDirectory: "",
        fileInfo: {},
        cdError: "",
        downloadError:"",
        downloadSuccess: "",
        lsList: [],
        delDirectory: "",
      }
    },
    created: {},
    methods: {
      saveIP() {
        if (this.namenodeIP !== "") this.isInitOpen = false;
      },
      printDate(dateString) {
        dateString = dateString.toString() * 1000;
        const date = new Date(dateString);
        let options = {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric'
        };
        return date.toLocaleDateString("en-US", options);
      },
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

        let reqUrl = "http://" + this.datanodeIPsList[0] + "1" + "/download";
        await this.downloadRequest(fileName, reqUrl, 0);
      },
      deleteFile() {
        const fileName = this.deleteFileName;

        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const url = "http://" + this.namenodeIP + "/delete_file";
          xhr.open("GET", url);
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
        this.fileInfo = {};
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const url = "http://" + this.namenodeIP + "/info";
          xhr.open("GET", url);
          xhr.setRequestHeader("File-Name", fileName);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
              this.fileInfo = JSON.parse(xhr.response);
              console.log(this.fileInfo);
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
          const url = "http://" + this.namenodeIP + "/copy";
          xhr.open("GET", url);
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
          const url = "http://" + this.namenodeIP + "/move";
          xhr.open("GET", url);
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
          const url = "http://" + this.namenodeIP + "/init";
          xhr.open("GET", url);
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
          const url = "http://" + this.namenodeIP + "/write";
          xhr.open("GET", url);
          xhr.setRequestHeader("File-Name", fileName);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
              this.datanodeIP = xhr.response;
              resolve();
            }
          };
          xhr.onerror = reject;
          xhr.send(null);
        });
      },
      createFile() {
        const fileName = this.createFileName;

        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const url = "http://" + this.namenodeIP + "/create";
          xhr.open("GET", url);
          xhr.setRequestHeader("File-Name", fileName);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
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
          const url = "http://" + this.namenodeIP + "/read";
          xhr.open("GET", url);
          xhr.setRequestHeader("File-Name", fileName);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
              this.downloadError = "";
              this.datanodeIPsList = JSON.parse(xhr.response);
              console.log(this.datanodeIPsList);
              resolve();
            } else {
              this.downloadError = "sorry, no such file was found";
            }
          };
          xhr.onerror = reject;
          xhr.send(null);
        });
      },
      cdRequest() {
        const directory = this.cdDirectory;

        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const url = "http://" + this.namenodeIP + "/cd";
          xhr.open("GET", url);
          xhr.setRequestHeader("Directory", directory);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
              this.cdError = "";
              this.currentPath = directory;
              console.log("moved");
              resolve();
            } else if (xhr.readyState === 4 && xhr.status === 400) {
              this.cdError = "no such directory";
              resolve();
            }
          };
          xhr.onerror = reject;
          xhr.send(null);
        });
      },
      lsRequest() {
        let directory;
        if (this.lsDirectory === "") directory = this.currentPath;
        else directory = this.lsDirectory;
        this.lsList = []

        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const url = "http://" + this.namenodeIP + "/ls";
          xhr.open("GET", url);
          xhr.setRequestHeader("Directory", directory);
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
              let lsResponse = xhr.response;
              console.log(lsResponse);
              let list = lsResponse.toString().replace("{", "").replace("}", "").split(",");
              for (let value of list) {
                let tuple = value.replace(" ", "").replace("\"", "").replace("\'", "").split(":");
                let name = tuple[0].replace(" ", "").replace("\"", "").replace("\'", "");
                let color = tuple[1].replace(" ", "").replace("\"", "").replace("\'", "");
                tuple = {};
                tuple.name = name;
                tuple.color = color;
                this.lsList.push(tuple)
              }
              console.log(this.lsList[0]);
              this.lsList.sort(function (a, b) {
                let nameA = a.name.toLowerCase(), nameB = b.name.toLowerCase();
                if (nameA < nameB)
                  return -1;
                if (nameA > nameB)
                  return 1;
                return 0
              });
              console.log(this.lsList[0]);
              resolve();
            } else if (xhr.readyState === 4 && xhr.status === 400) {
              let tuple = {};
              tuple.name = "no such directory";
              tuple.color = 'true';
              this.lsList.push(tuple);
              resolve();
            }
          };
          xhr.onerror = reject;
          xhr.send(null);
        });
      },
      mkdirRequest() {
        const directory = this.mkDirectory;
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const url = "http://" + this.namenodeIP + "/mkdir";
          xhr.open("GET", url);
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
      delDirRequest() {
        const directory = this.delDirectory;
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const url = "http://" + this.namenodeIP + "/delete_dir";
          xhr.open("GET", url);
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
      downloadRequest(fileName, reqUrl, i) {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", reqUrl);
          xhr.setRequestHeader("File-Name", fileName);
          xhr.responseType = 'blob';
          xhr.onreadystatechange = function () {
            let a;
            if (xhr.readyState === 4 && xhr.status === 200) {
              this.downloadError = "";
              a = document.createElement('a');
              let url = window.URL.createObjectURL(xhr.response);
              a.href = url;
              a.download = fileName.split('/').pop();
              a.style.display = 'none';
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
              resolve();
            } else {
              this.downloadError = "sorry, no such file was found";
            }
          };
          xhr.onerror = reject;
          xhr.send(null);
        });
      }
    }
  }
</script>

<style scoped>
  .modal {
    position: fixed; /* Stay in place */
    z-index: 1; /* Sit on top */
    padding-top: 100px; /* Location of the box */
    left: 0;
    top: 0;
    width: 100%; /* Full width */
    height: 100%; /* Full height */
    overflow: auto; /* Enable scroll if needed */
    background-color: rgb(0, 0, 0); /* Fallback color */
    background-color: rgba(0, 0, 0, 0.4); /* Black w/ opacity */
  }

  /* Modal Content */
  .modal-content {
    background-color: #fefefe;
    margin: auto;
    padding: 20px;
    border: 1px solid #888;
    width: 80%;
  }

  /* The Close Button */
  .close {
    color: #aaaaaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
  }

  .close:hover,
  .close:focus {
    color: #000;
    text-decoration: none;
    cursor: pointer;
  }
</style>
