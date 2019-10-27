<template>
  <input type="file" ref="file" placeholder="upload a file">
</template>

<script>
  import {MainPageAPI} from 'api'
  export default {
    name: "MainPage",
    data() {
      return {
        chunkSize: 256
      }
    },
    created() {

    },
    methods() {
      function uploadFile(file) {
        const chunksNumber = Math.ceil(file.size / this.chunkSize);
        const chunksQueue = new Array(chunksNumber).fill().map((_, index) => index).reverse();

        while (!!chunksQueue.length && chunksQueue.length > 0) {
          let chunkId = chunksQueue.pop();
          console.log("Uploading chunk #" + chunkId + "...");

          let begin = chunkId * this.chunkSize;
          let currentChunk = file.slice(begin, begin + this.chunkSize);

          MainPageAPI.uploadChunk(
            chunkId.toString(),
            currentChunk,
            file.name.toString(),
            "1",
            file.size().toString()
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
      }
    }
  }
</script>

<style scoped>

</style>
