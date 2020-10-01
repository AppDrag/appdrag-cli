const { getDirectoryListing } =  require('../../utils/filesystem/filesystem')
const fetch = require('node-fetch');
const unzipper = require('unzipper');
const fs = require('fs');
const chalk = require('chalk');
const { downloadFile } = require('../../utils/common');


const parseDirectory = (token, appId, files, lastfile, currentPath) => {
  return new Promise( async (resolve, reject) => {
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
          let newLast = path + '/' + newFiles[newFiles.length - 1].path;
          await parseDirectory(token, appId, newFiles, newLast, path);
        }
      } else {
        const regex = RegExp(/(.html|.js|.xml|.css|.txt)$/gm);
        if (fs.existsSync(path) && !(regex.test(path))) {
          if (x+1 === files.length) {
            resolve();
          }
          else continue;
        } else {
          await downloadFile(path, appId);
        }
            if (path === lastfile) {
              resolve();
            }
      }
    }
    resolve();
  });
};

const isFolder = async (token, appId, folder, path) => {
if (!fs.existsSync(path)) {
  fs.mkdirSync(path);
}
let newFiles = await getDirectoryListing(token, appId, path);
return newFiles;
}

const replaceLinks = (filePath, appId) => {
  if (fs.existsSync(filePath)) {
    let file_content = fs.readFileSync(filePath);
    let regexp = new RegExp(`//s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/`,"g");
    let regexp2 = new RegExp(`https://cf.appdrag.com/${appId}/`,"g")
    let regexp3 = new RegExp(`//cf.appdrag.com/${appId}/`, "g");
    let regexp4 = new RegExp(`//s3-eu-west-1.amazonaws.com/dev.appdrag.com/resources/`,"g");
    let regexp5 = new RegExp('//cf.appdrag.com/resources/',"g");
    file_content = file_content.toString('utf-8');
    file_content = file_content.replace(regexp, "./").replace(regexp2,'./').replace(regexp3,'./').replace(regexp4, './').replace(regexp5, './');
    fs.writeFileSync(filePath, file_content);
    console.log(chalk.blue(`Replacing contents of ${filePath}`))
  }
}

const parseHtmlFiles = (appId) => {
  let files = fs.readdirSync('.');
  files.forEach((file) => {
    if (file.slice(-5) == '.html') {
      replaceLinks('./' + file, appId);
    }
  });
}

const downloadResources = async () => {
  console.log(chalk.yellowBright(`Downloading online resources...`));
  if (!fs.existsSync('js')) {
    fs.mkdirSync('js');
  }
  if (!fs.existsSync('css')) {
    fs.mkdirSync('css');
  }
  let urls = [
    'https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/resources/css/appdrag.css',
    'https://cf.appdrag.com/resources/appallin-universal-theme.css',
    'https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/resources/js/appdrag.js'
  ];
  for (let x = 0; x < urls.length ;x++) {
    let path = urls[x].replace(/.*resources\//g, "");
    let file = fs.createWriteStream(path, { encoding: 'utf8' });
    let response = await fetch(urls[x], {
      method: 'GET',
    });
    response.body.pipe(file);
    file.on('finish', () => {
      if (path === urls[urls.length - 1].replace(/.*resources\//g, "")) {
        console.log('Done downloading')
        return;
      }
      file.close();
    });
  }
}

const deployCloudBackend = async (token, appId, funcs, baseFolder) => {
  let apiKey = await getApiKey(token, appId);
  if (!fs.existsSync(baseFolder)) {
    fs.mkdirSync(baseFolder);
  }
  if (!fs.existsSync(`${baseFolder}/api`)) {
    fs.mkdirSync(`${baseFolder}/api`);
  }
  for (const funcFolder in funcs) {
    let basePath = `${baseFolder}/api`;
    for (let x = 0; x < funcs[funcFolder].functions.length ;x++) {
      let func = funcs[funcFolder].functions[x];
      let filePath = '';
      if (!funcs[funcFolder].name) {
         filePath += `${basePath}`;
      } else {
        filePath += `${basePath}/${funcs[funcFolder].name}`;
        if (!fs.existsSync(filePath)) {
          fs.mkdirSync(filePath);
        }
      }
      if (func.type === 'SELECT') {
        writeSelectVSQLFile(func, filePath);
      } else if (func.type === 'UPDATE') {
        writeUpdateVSQLFile(func, filePath);
      } else if (func.type === 'INSERT') {
        writeInsertVSQLFile(func, filePath);
      } else if (func.type === 'DELETE') {
        writeDeleteVSQLFile(func, filePath);
      } else if (func.type.slice(0,3) === 'SQL') {
        writeSQLFile(func, filePath);
      }
      await downloadAndWriteFunction(token, appId, filePath, func, apiKey);
    }
  }
  return apiKey;
};

const flattenFunctionList = (functions) => {
  let finalObj = {
    '/': {
      functions: []
    }
  };
  functions.forEach((func) => {
    if (func.type === 'FOLDER') {
      finalObj[func.id] = {
        name: func.name,
        functions: []
      };
    }
  });

  functions.forEach((func) => {
    if (func.type !== 'FOLDER') {
      if (func.parentID !== -1) {
        finalObj[func.parentID].functions.push(func);
      } else {
        finalObj['/'].functions.push(func);
      }
    }
  });
  return finalObj;
};

const downloadAndWriteFunction = async (token, appId, path, functionObj, apiKey) => {
  let filePath = `./${path}/${appId}_${functionObj.id}.zip`;
  let data = {
    command: 'CloudAPIExportFile',
    token: token,
    appID: appId,
    file: 'main.js',
    functionID: functionObj.id,
  };
  if (functionObj.parentID !== -1) {
    data.parentID = functionObj.parentID;
  }

  let file = fs.createWriteStream(filePath);
  let url = await getFunctionURL(data);
  let response = await fetch(url, {
    method: 'GET'
  });
  response.body.pipe(file);
  file.on('close', () => {
    fs.createReadStream(filePath)
    .pipe(unzipper.Extract({path: path}))
    .on('close', () => {
      console.log(chalk.green(`Finished writing "${functionObj.name}"`));
      fs.access(`${path}/main.js`, (err) => {
        if (err) {
          return;
        } else {
          fs.renameSync(`${path}/main.js`, `${path}/${functionObj.name}.js`);
        }
      });
      fs.access(`${path}/main.py`, (err) => {
        if (err) {
          return;
        } else {
          fs.renameSync(`${path}/main.py`, `${path}/${functionObj.name}.py`);
        }
      });
      fs.access(`${path}/backup.csv`, (err) => {
        if (err) {
          return;
        } else {
          fs.unlinkSync(`${path}/backup.csv`);
        }
      });
      fs.access(`${path}/backup.json`, (err) => {
        if (err) {
          return;
        } else {
          fs.unlinkSync(`${path}/backup.json`);
        }
      });
      fs.access(`${path}/main.zip`, (err) => {
        if (err) {
          return;
        } else {
          fs.unlinkSync(`${path}/main.zip`);
        }
      });
    }).on('finish', () => {      
      fs.unlinkSync(filePath);
    });
  });
};

const writeSelectVSQLFile = (functionObj, filePath) => {
  let finalQuery = "";
  let columns = "";
  let whereConditions = JSON.parse(functionObj.whereConditions);
  let outputColumns = JSON.parse(functionObj.outputColumns);
  if (outputColumns !== [] && outputColumns) {
    outputColumns.map((col) => {
      columns += `${col},`;
    });
    columns = columns.slice(0, -1);

    finalQuery += `SELECT ${columns} FROM ${functionObj.tableName}`;
  }
  let where = "";
  if (whereConditions !== [] && whereConditions) {
    whereConditions.map((condition) => {
      let value = "";
      if (condition.type == "value" || condition.type == "formula") {
        value = condition.value;
      } else {
        if (condition.value === null) {
          return;
        }
        value = ' @PARAM_' + condition.value.replace("'", "''");
      }
      let quotedValue = value;
      let matchValue = condition.signOperator + quotedValue;
      if (condition.signOperator == "contains")
      {
          matchValue = "LIKE '%" + value + "%'";
      }
      else if (condition.signOperator == "not contains")
      {
          matchValue = "NOT LIKE '%" + value + "%'";
      }
      else if (condition.signOperator == "starts with")
      {
          matchValue = "LIKE '" + value + "%'";
      }
      else if (condition.signOperator == "in")
      {
          matchValue = "IN (" + value + ")";
      }
      else if (condition.signOperator == "ends with")
      {
          matchValue = "LIKE '%" + value + "'";
      }
      else if (condition.signOperator == "is")
      {
          matchValue = "IS " + value;
      }
      else if (condition.signOperator == "is not")
      {
          matchValue = "IS NOT " + value;
      }
      finalQuery += " " + condition.conditionOperator + " `" + condition.column + "` " + matchValue;
    });
  }
  // ORDER BY ==============================
  if (functionObj.orderByColumn != ""){
    let orderBy = "";
    let orderByDirections = functionObj.orderByDirection;
    let idx = 0;
    if (orderByDirections !== null) {
      orderByDirections = orderByDirections.split(',');
    }
    let orderByColumn = functionObj.orderByColumn;
    if (orderByColumn !== null) {
      orderByColumn = orderByColumn.split(',');
      orderByColumn.forEach((column) => {
        if (orderBy!= "")
        {
          orderBy += ", ";
        }
        orderBy += "`" + column + "`";
        if (idx < orderByDirections.Length)
        {
          orderBy += " " + orderByDirections[idx];
        }
        idx++;
      });
    }
    if (orderBy != "") {
      finalQuery += " ORDER BY " + orderBy;
    }
  }
  fs.writeFileSync(`${filePath}/${functionObj.name}.sql`, finalQuery);
}

const writeUpdateVSQLFile = (functionObj, filePath) => {
  let finalQuery = `UPDATE ${functionObj.tableName} SET `;
  let mappingColumns = JSON.parse(functionObj.mappingColumns);
  let whereConditions = JSON.parse(functionObj.whereConditions);

  let updateStr = "";
  if (mappingColumns) {
    mappingColumns.forEach((condition) => {
      let value = "";
      if (condition.type == 'value' || condition.type=='formula') {
        value = condition.value;
      } else {
        if (condition.value == null) {
          return;
        }
      }
      if (updateStr != ""){
        updateStr += ",";
      }
      if (condition.type != "formula") {
        value = "'" + value + "'";
      }
      updateStr += "`" +condition.column + "`=" + value + " ";
    });
  }
  finalQuery += updateStr;
  let where = "";
  if (whereConditions !== [] && whereConditions) {
    whereConditions.map((condition) => {
      let value = "";
      if (condition.type == "value" || condition.type == "formula") {
        value = condition.value;
      } else {
        if (condition.value === null) {
          return;
        }
        value = condition.value.replace("'", "''");
      }
      let quotedValue = value;
      let matchValue = condition.signOperator + quotedValue;
      if (condition.signOperator == "contains")
      {
          matchValue = "LIKE '%" + value + "%'";
      }
      else if (condition.signOperator == "not contains")
      {
          matchValue = "NOT LIKE '%" + value + "%'";
      }
      else if (condition.signOperator == "starts with")
      {
          matchValue = "LIKE '" + value + "%'";
      }
      else if (condition.signOperator == "in")
      {
          matchValue = "IN (" + value + ")";
      }
      else if (condition.signOperator == "ends with")
      {
          matchValue = "LIKE '%" + value + "'";
      }
      else if (condition.signOperator == "is")
      {
          matchValue = "IS " + value;
      }
      else if (condition.signOperator == "is not")
      {
          matchValue = "IS NOT " + value;
      }
      finalQuery += " " + condition.conditionOperator + " `" + condition.column + "` " + matchValue;
    });
  }
  fs.writeFileSync(`${filePath}/${functionObj.name}.sql`, finalQuery);
};

const writeInsertVSQLFile = (functionObj, filePath) => {
  let finalQuery = "";
  let cols = '';
  let vals = '';
  let mappingColumns = JSON.parse(functionObj.mappingColumns);
  if (mappingColumns) {
    mappingColumns.map((condition) => {
      let value = '';
      if (condition.type == 'value' || condition.type == 'formula') {
        value = condition.value;
      } else {
        if (condition.value == null) {
          return;
        }
        value = condition.value.replace("'", "''");
      }
      if (cols != '') {
        cols += ',';
      }
      cols += "`" + condition.column + "`";
      if (vals != ""){
        vals += ",";
      }
      if (condition.type != "formula") {
        value = "'" + value + "'";
      }
      vals += value;
    });
  }
  finalQuery += " INSERT INTO " + functionObj.tableName;
  finalQuery += " (" + cols + ") values (" + vals + ") ";
  fs.writeFileSync(`./${filePath}/${functionObj.name}.sql`, finalQuery);
};

const writeDeleteVSQLFile = (functionObj, filePath) => {
  let finalQuery = `DELETE FROM ${functionObj.tableName} `
  let whereConditions = JSON.parse(functionObj.whereConditions);

  let where = "";
  if (whereConditions !== [] && whereConditions) {
    whereConditions.map((condition) => {
      let value = "";
      if (condition.type == "value" || condition.type == "formula") {
        value = condition.value;
      } else {
        if (condition.value === null) {
          return;
        }
        value = condition.value.replace("'", "''");
      }
      let quotedValue = value;
      let matchValue = condition.signOperator + quotedValue;
      if (condition.signOperator == "contains")
      {
          matchValue = "LIKE '%" + value + "%'";
      }
      else if (condition.signOperator == "not contains")
      {
          matchValue = "NOT LIKE '%" + value + "%'";
      }
      else if (condition.signOperator == "starts with")
      {
          matchValue = "LIKE '" + value + "%'";
      }
      else if (condition.signOperator == "in")
      {
          matchValue = "IN (" + value + ")";
      }
      else if (condition.signOperator == "ends with")
      {
          matchValue = "LIKE '%" + value + "'";
      }
      else if (condition.signOperator == "is")
      {
          matchValue = "IS " + value;
      }
      else if (condition.signOperator == "is not")
      {
          matchValue = "IS NOT " + value;
      }
      finalQuery += " " + condition.conditionOperator + " `" + condition.column + "` " + matchValue;
    });
  }
  fs.writeFileSync(`./${filePath}/${functionObj.name}.sql`, finalQuery);
};

const writeSQLFile = (functionObj, filePath) => {
  fs.writeFileSync(`./${filePath}/${functionObj.name}.sql`, functionObj.sourceCode);
  return;
};

const getFunctionURL = async (data) => {
  let opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(data).toString()
  };
  let res = await fetch('https://api.appdrag.com/CloudBackend.aspx', opts);
  res = await res.json();
  return res.url;
};

const getApiKey = async (token, appId) => {
  let res = await fetch('https://api.appdrag.com/CloudBackend.aspx', {
    method:'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({command:'CloudDBGetSecretKey', token: token, appID: appId})
  });
  res =  await res.json();
  return res.secret_key;
};

const downloadDb = async (appId, token, folder) => {
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
    let version = await getDbVersions(appId, token);
    if (!version) {
      return;
    }
    await downloadLastDbVersion(appId, token, version, folder);
    return;
  }
  databaseUrl = databaseUrl.url;
  let file = fs.createWriteStream(`${folder}/DB/db.sql`);
  let response = await fetch(databaseUrl, {
    method: 'GET',
  });
  response.body.pipe(file);
  file.on('close', () => {
    console.log(chalk.green(`Done downloading database !`));
  });
};

const getDbVersions = async (appId, token) => {
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
        return false;
      }
    }
  }
  let versionId = fileVersions[0].VersionId;
  return versionId;
};

const downloadLastDbVersion = async (appId, token, version, folder) => {
  let file = fs.createWriteStream(`${folder}/DB/db.sql`);
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
    console.log(chalk.green(`Done downloading database !`));
  });
};

const appConfigJson = (appId, funcJson, baseFolder, apiKey) => {
  let object = {
    "env": "PROD",
    "version": "1.0.0",
    "title": `${appId}`,
    "description": `${appId} Pulled from appdrag.com`,
    "domains": ["*"], 
    "publicFolder": "./public",
    "TypeAPI": "LOCAL",
    "TypeFS": "LOCAL",
    "redirect404toIndex": true,
    "acceptedFiles": "*.jpg|*.png|*.mp4|*.zip|*.jpeg|*.pdf",
    "HSTS": false,
    "rateLimiter" : {
      "requestsPerSecond" : 10
    },
    "CORS": {
        "access-control-allow-origin": "*"
    },
    "uploadFolder": "public/uploads/",
    "globalEnv" : {
      APPID: appId,
      APIKEY: apiKey
    },
    "db": {
      "MYSQL": {
          "dump": `./DB/db.sql`,
          "database": `${appId}`,
          "host": "AUTO",
          "port": "AUTO",
          "user": "AUTO",
          "password": "AUTO",
          "apiToken": "AUTO",
          "apiEndpoint": ""
      }
    },
    "apiEndpoints": {}
  };
  for (const key in funcJson) {
    funcJson[key]['functions'].forEach(func => {
      let pathToFunction;
      if (funcJson[key].name) {
        pathToFunction = `/${funcJson[key].name}/${func.name}`;
      } else {
        pathToFunction = `/${func.name}`;
      }
      let pathToFolder = pathToFunction.split('/').slice(0,-1).join('/') + '/';
      object.apiEndpoints[`/api${pathToFunction}`] = { 
          src:`./api${pathToFolder}`,
          vpath: `./api${pathToFunction}`,
          realpath:  `./${baseFolder}/api${pathToFunction}`,
          handler: `${func.name}.handler`,
          type: `${func.type}`,
          lastParams: JSON.parse(func.lastParams),
          method: func.method,
          output: func.output,
          parametersList: JSON.parse(func.parametersList),
          whereConditions: JSON.parse(func.whereConditions),
          tableName: func.tableName,
          orderByDirection: func.orderByDirection,
          orderByColumn: func.orderByColumn,
          outputColumns: JSON.parse(func.outputColumns),
          mappingColumns: JSON.parse(func.mappingColumns),
          sourceCode: func.sourceCode,
          isPrivate: func.isPrivate
      };
      if (func.envVars) {
        object.apiEndpoints[`${pathToFunction}`].envVars = JSON.parse(func.envVars);
      }
      if (func.type !== "SELECT" && func.type !== "UPDATE" && func.type !== "DELETE" && func.type !== "INSERT" && func.type.slice(0,3) !== 'SQL') {
        delete object.apiEndpoints[`${pathToFunction}`].sourceCode;
        delete object.apiEndpoints[`${pathToFunction}`].mappingColumns;
        delete object.apiEndpoints[`${pathToFunction}`].outputColumns;
        delete object.apiEndpoints[`${pathToFunction}`].orderByColumn;
        delete object.apiEndpoints[`${pathToFunction}`].orderByDirection;
        delete object.apiEndpoints[`${pathToFunction}`].tableName;
        delete object.apiEndpoints[`${pathToFunction}`].whereConditions;
      }
    });
  }
  let toWrite = JSON.stringify(object);
  fs.writeFileSync(`./${baseFolder}/appconfig.json`, toWrite);
  return;
};

module.exports = { flattenFunctionList, appConfigJson, parseDirectory, isFolder, parseHtmlFiles, replaceLinks, downloadResources, deployCloudBackend, downloadDb };