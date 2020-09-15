const fetch = require('node-fetch');
const fs = require('fs');
const chalk = require('chalk');
const FormData = require('form-data');
const { refreshToken, config, tokenObj } = require('../../utils/common');

const pushDbToCloudBackend = async (appId, token, filePath) => {
  let file = fs.readFileSync(filePath);
  let form = new FormData();
  form.append('command', 'CloudDBRestoreDB');
  form.append('upload', file, filePath);
  form.append('appID', appId);
  form.append('token', token);

  let url = 'https://api.appdrag.com/CloudBackend.aspx'
  form.submit(url, (err, res) => {
    if (res.statusMessage === 'OK') {
      console.log(chalk.green(`${filePath} successfully uploaded !`));
      return;
    } else {
      console.log(chalk.red(`Error when trying to upload file`));
      return;
    }
  });
}

const downloadDb = async (appId, token) => {
  let data = {
    command: 'CloudDBExportFile',
    token: token,
    appID: appId,
  };
  var opts = {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(data),
  };
  let databaseUrl = await fetch('https://api.appdrag.com/CloudBackend.aspx', opts);
  databaseUrl = await databaseUrl.json();
  if (databaseUrl.status !== 'OK') {
    await getAllDbVersions(appId, token);
    return;
  }
  databaseUrl = databaseUrl.url;
  let file = fs.createWriteStream(`${appId}_backup.sql`);
  let response = await fetch(databaseUrl, {
    method: 'GET',
  });
  response.body.pipe(file);
  file.on('close', () => {
    console.log(chalk.green(`Done writing ${appId}_backup.sql !`));
  });
};

const getAllDbVersions = async (appId, token) => {
  let data = {
    command: 'GetFileVersions',
    token: token,
    appID: appId,
    path: 'CloudBackend/db/backup.sql',
  };
  var opts = {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(data),
  };
  let fileVersions = await fetch ('https://api.appdrag.com/api.aspx', opts);
  fileVersions = await fileVersions.json();
  if (fileVersions.status === 'KO') {
    if (tokenObj.method == 'login') {
      let token_ref = config.get('refreshToken');
      await refreshToken(token_ref);
      fileVersions = await fetch ('https://api.appdrag.com/api.aspx', opts);
      fileVersions = await fileVersions.json();
      if (fileVersions.status == 'KO') {
        console.log(chalk.red('Invalid appId provided and/or please login again.'));
        return;
      }
    }
  }
  let versionId = fileVersions[0].VersionId;
  await downloadLastDbVersion(appId, token, versionId);
};

const downloadLastDbVersion = async (appId, token, version) => {
  let file = fs.createWriteStream(`${appId}_backup.sql`);
  let data = {
    command: 'CloudDBDownloadRestore',
    token: token,
    appID: appId,
    version: version,
  };
  var opts = {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(data),
  };
  let dbUrl = await fetch ('https://api.appdrag.com/CloudBackend.aspx', opts);
  dbUrl = await dbUrl.json();
  if (dbUrl.status === 'KO') {
    return;
  }
  let response = await fetch (dbUrl.url, {
    method: 'GET',
  });
  response.body.pipe(file);
  file.on('close', () => {
    console.log(chalk.green(`Done !`));
  });
};

module.exports = { downloadDb, pushDbToCloudBackend }