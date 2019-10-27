export const MainPageAPI = new class {
  public uploadChunk(
    chunkId: string,
    chunk,
    fileName: string,
    fileId: string,
    fileSize: string) {
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
}();
