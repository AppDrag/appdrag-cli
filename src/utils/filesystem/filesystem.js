const fetch = require('node-fetch');
const fs = require('fs');
const archiver = require('archiver');
const chalk = require('chalk')
const { config, refreshToken } = require('../common')

const createZip = async (sourceFolder, zipPath, currFolder) => {
  let isErr = false;
  await zipFolder(sourceFolder, zipPath, currFolder).catch((err) => {
    isErr = true;
  });
  return isErr;
};

const zipFolder = async (sourceFolder, zipPath, curFolder) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(curFolder + '/' + sourceFolder)) {
      reject();
      return;
    }
    let output = fs.createWriteStream(curFolder + '/' + zipPath);
    var archive = archiver('zip', {
      zlib: { level: 9 },
    });
    output.on('close', () => {
      resolve(zipPath.replace('.zip', ''));
      return;
    });
    archive.on('error', function (err) {
      fs.unlinkSync(zipPath);
      reject(false);
      return;
    });
    archive.pipe(output);
    archive.directory(sourceFolder + '/', false);
    archive.finalize();
  })
};

const pushFiles = async (appId, filePath, token, destPath) => {
  let fileContent = fs.createReadStream(filePath);
  let fileSizeInBytes = fs.statSync(filePath).size;
  let url = await getSignedURL(appId, filePath, token);
  if (url.status === 'KO') {
    url = await getSignedURL(appId, filePath, token);
    if (url.status == 'KO') {
      let token_ref = config.get('refreshToken');
      await refreshToken(token_ref);
      console.log(chalk.blue('Please login again.'));
      return;
    }
  }
  url = url.signedURL;
  await pushToAwsS3(fileContent, fileSizeInBytes, url);
  await unzipAndDelete(appId, token, destPath, filePath);
}

const getSignedURL = async (appId, filePath, token) => {
  let data = new URLSearchParams({
    command: 'GetUploadUrl',
    token: token,
    appID: appId,
    filekey: filePath
  });

  var opts = {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: data,
  };
  let response = await fetch('https://api.appdrag.com/api.aspx', opts);
  response = await response.json();
  return response;
};

const pushToAwsS3 = async (fileContent, fileSizeInBytes, url) => {
  var opts = {
    method: 'PUT',
    headers: { 'Content-length': fileSizeInBytes },
    body: fileContent
  }
  let response = await fetch(url, opts);
  try {
    response = await response.json();
    return response;
  } catch {
    return response;
  }
}

const unzipAndDelete = async (appId, token, destPath, filePath) => {
  let opts_unzip = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({
      command: 'ExtractZipS3Lambda',
      token: token,
      appId: appId,
      filekey: filePath,
      destpath: destPath
    })
  }
  await fetch('https://api.appdrag.com/api.aspx?', opts_unzip);
}

const getDirectoryListing = async (token, appId, pathToPull) => {
  let data = {
    command: 'GetDirectoryListing',
    token: token,
    appID: appId,
    path: pathToPull,
    order: 'name',
  };
  var opts = {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(data),
  };
  let response = await fetch('https://api.appdrag.com/api.aspx',opts);
  try {
    return response.json();
  } catch {
    return response;
  }
}

const parseDirectory =  async (token, appId, files, lastfile, currentPath) => {
    for (var x = 0; x < files.length; x++) {
      let path;
      if (currentPath === '') {
        path = files[x].path;
      } else {
        path = `${currentPath}/${files[x].path}`;
      }
      if (files[x].type == 'FOLDER') {
        if (files[x].path  == 'CloudBackend') {
          continue;
        }
        let newFiles = await isFolder(token, appId, files[x], path);
        if (newFiles.length > 0) {
          await parseDirectory(token, appId, newFiles, lastfile, path);
        }
      } else {
        let file = fs.createWriteStream(path, {'encoding': 'utf-8'});
        let response = await fetch(`https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/${path}`, {
          method: 'GET'
        });
        response.body.pipe(file);
        file.on('finish', () => {
          console.log(chalk.green(`done writing : ${path}`));
          file.close();
          if (path === lastfile) {
            return true;
          }
        })
      }
    }
}

const isFolder = async (token, appId, folder, path) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
  let newFiles = await getDirectoryListing(token, appId, path);
  return newFiles;
}

const pullSingleFile = async (appId, path) => {
  let response = await fetch(`https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/${path}`, {
    method: 'GET'
  });
  if (response.status === 403) {
    console.log(chalk.red('File/folder does not exist.'));
    return;
  } else {
    let file = fs.createWriteStream(path, {'encoding': 'utf-8'});
    response.body.pipe(file);
    file.on('finish', () => {
      console.log(chalk.green(`done writing : ${path}`));
      file.close();
    });
  }
}

module.exports = { zipFolder, createZip, pushFiles, getDirectoryListing, parseDirectory, getSignedURL, pushToAwsS3, pullSingleFile };