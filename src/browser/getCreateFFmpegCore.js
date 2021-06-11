/* eslint-disable no-undef */
const resolveURL = require('resolve-url');
const { log } = require('../utils/log');

/*
 * Fetch data from remote URL and convert to blob URL
 * to avoid CORS issue
 */
const toBlobURL = async (url, mimeType) => {
  log('info', `fetch ${url}`);
  const buf = await (await fetch(url)).arrayBuffer();
  log('info', `${url} file size = ${buf.byteLength} bytes`);
  const blob = new Blob([buf], { type: mimeType });
  const blobURL = URL.createObjectURL(blob);
  log('info', `${url} blob URL = ${blobURL}`);
  return blobURL;
};

module.exports = async ({ corePath: _corePath, isWorker = false }) => {
  if (typeof _corePath !== 'string') {
    throw Error('corePath should be a string!');
  }

  const coreRemotePath = isWorker ? _corePath : resolveURL(_corePath)
  let corePath, wasmPath, workerPath

  if (!isWorker) {
    corePath = await toBlobURL(
      coreRemotePath,
      'application/javascript',
    );
    wasmPath = await toBlobURL(
      coreRemotePath.replace('ffmpeg-core.js', 'ffmpeg-core.wasm'),
      'application/wasm',
    );
    workerPath = await toBlobURL(
      coreRemotePath.replace('ffmpeg-core.js', 'ffmpeg-core.worker.js'),
      'application/javascript',
    );
    if (typeof createFFmpegCore === 'undefined') {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        const eventHandler = () => {
          script.removeEventListener('load', eventHandler);
          log('info', 'ffmpeg-core.js script loaded');
          resolve({
            createFFmpegCore,
            corePath,
            wasmPath,
            workerPath,
          });
        };
        script.src = corePath;
        script.type = 'text/javascript';
        script.addEventListener('load', eventHandler);
        document.getElementsByTagName('head')[0].appendChild(script);
      });
    }
  } else {
    corePath = await fetch(coreRemotePath);
    wasmPath = await fetch(coreRemotePath.replace('ffmpeg-core.js', 'ffmpeg-core.wasm'));
    workerPath = await fetch(coreRemotePath.replace('ffmpeg-core.js', 'ffmpeg-core.worker.js'));
    if (typeof createFFmpegCore === 'undefined') {
      return new Promise(async (resolve) => {
        await self.importScripts(coreRemotePath);
        log('info', 'ffmpeg-core.js script loaded');
        resolve({
          createFFmpegCore,
          corePath,
          wasmPath,
          workerPath,
        });
      });
    }
  }
  log('info', 'ffmpeg-core.js script is loaded already');
};
