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

//TODO: 1e128 files should be locally downloaded & hosted!
const replaceLinks = (filePath, appId) => {
  if (fs.existsSync(filePath)) {
    let file_content = fs.readFileSync(filePath);
    
    let regexp0 = new RegExp(`https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/`,"g");
    let regexp1 = new RegExp(`//s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/`,"g");
    let regexp2 = new RegExp(`https://cf.appdrag.com/${appId}/`,"g")
    let regexp3 = new RegExp(`//cf.appdrag.com/${appId}/`, "g");
    let regexp3_1 = new RegExp(`//cf.appdrag.com/resources/appallin-universal-theme.css`, "g");
    let regexp4 = new RegExp(`//s3-eu-west-1.amazonaws.com/dev.appdrag.com/resources/`,"g");
    let regexp5 = new RegExp('//cf.appdrag.com/resources/',"g");
    let regexp6 = new RegExp(`https://${appId}.appdrag.com/`, "g");
    let regexp7 = new RegExp(`https://${appId}.appdrag.site/`, "g");
    

    file_content = file_content.toString('utf-8');
    file_content = file_content.replace(regexp0, "./")
    .replace(regexp1, "./")
    .replace(regexp2,'./')
    .replace(regexp3,'./')
    .replace(regexp3_1,'./css/appallin-universal-theme.css')
    .replace(regexp4, './')
    .replace(regexp5, './')
    .replace(regexp6, './')
    .replace(regexp7, './');

    //file_content = file_content.replace("https://1e128.net/assets/fontawesome/css/fa5.css", '../css/fa5.css');

    fs.writeFileSync(filePath, file_content);
    console.log(chalk.blue(`Replacing contents of ${filePath}`))
  }
}

const parseHtmlFiles = (appId) => {
  let files = fs.readdirSync('.');
  //console.log("files in root folder: " + files.length);
  files.forEach((file) => {
    var fileExt = file.split('.').pop();
    if (fileExt == 'html') {
      replaceLinks('./' + file, appId);
    }
  });

  /*
  files = fs.readdirSync('./preview/');
  //console.log("files in preview folder: " + files.length);
  files.forEach((file) => {
    var fileExt = file.split('.').pop();
    if (fileExt == 'html') {
      replaceLinks('./' + file, appId);
    }
  });

  files = fs.readdirSync('./css/');
  //console.log("files in css folder: " + files.length);
  files.forEach((file) => {
    var fileExt = file.split('.').pop();
    if (fileExt == 'css') {
      replaceLinks('./css/' + file, appId);
    }
  });

  files = fs.readdirSync('./js/');
  //console.log("files in js folder: " + files.length);
  files.forEach((file) => {
    var fileExt = file.split('.').pop();
    if (fileExt == 'js') {
      replaceLinks('./js/' + file, appId);
    }
  });
  */

}

const downloadResources = async () => {
  console.log(chalk.yellowBright(`Downloading online resources...`));
  if (!fs.existsSync('js')) {
    fs.mkdirSync('js');
  }
  if (!fs.existsSync('css')) {
    fs.mkdirSync('css');
  }
  if (!fs.existsSync('webfonts')) {
    fs.mkdirSync('webfonts');
  }

  var urls = [{
      url: "https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/resources/css/appdrag.css",
      local: "css/appdrag.css"
  },
  {
      url: "https://cf.appdrag.com/resources/appallin-universal-theme.css",
      local: "css/appallin-universal-theme.css"
  },
  {
      url: "https://1e128.net/assets/fontawesome/css/fa5.css",
      local: "css/fa5.css"
  },
  {
      url: "https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/resources/js/appdrag.js",
      local: "js/appdrag.js"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-light-300.eot",
      local: "webfonts/fa-light-300.eot"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-light-300.woff2",
      local: "webfonts/fa-light-300.woff2"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-light-300.woff",
      local: "webfonts/fa-light-300.woff"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-light-300.ttf",
      local: "webfonts/fa-light-300.ttf"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-brands-400.eot",
      local: "webfonts/fa-brands-400.eot"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-brands-400.woff2",
      local: "webfonts/fa-brands-400.woff2"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-brands-400.woff",
      local: "webfonts/fa-brands-400.woff"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-brands-400.ttf",
      local: "webfonts/fa-brands-400.ttf"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-regular-400.eot",
      local: "webfonts/fa-regular-400.eot"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-regular-400.woff2",
      local: "webfonts/fa-regular-400.woff2"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-regular-400.woff",
      local: "webfonts/fa-regular-400.woff"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-regular-400.ttf",
      local: "webfonts/fa-regular-400.ttf"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-solid-900.eot",
      local: "webfonts/fa-solid-900.eot"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-solid-900.woff2",
      local: "webfonts/fa-solid-900.woff2"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-solid-900.woff",
      local: "webfonts/fa-solid-900.woff"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-solid-900.ttf",
      local: "webfonts/fa-solid-900.ttf"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-duotone-900.eot",
      local: "webfonts/fa-duotone-900.eot"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-duotone-900.woff2",
      local: "webfonts/fa-duotone-900.woff2"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-duotone-900.woff",
      local: "webfonts/fa-duotone-900.woff"
  },
  {
      url: "https://1e128.net/assets/fontawesome/webfonts/fa-duotone-900.ttf",
      local: "webfonts/fa-duotone-900.ttf"
  },
  {
      url: "https://cf.appdrag.com/resources/builder/transparency-large%20(normal).png",
      local: "css/transparency-large (normal).png"
  }];


  for (let x = 0; x < urls.length ;x++) {

    let path = urls[x].local;
    let file = fs.createWriteStream(path, { encoding: 'utf8' });
    let response = await fetch(urls[x].url, {
      method: 'GET',
    });
    response.body.pipe(file);
    file.on('finish', () => {

      if ( path == "js/appdrag.js" ){
        //console.log("going to fix: " + require("path").resolve(path) );
        ReplaceInFile('https://1e128.net/assets/fontawesome/css/fa5.css', "../css/fa5.css", path);
        //console.log("fixed fa5");
      }

      if ( path == "css/appdrag.css" ){
        ReplaceInFile('https://cf.appdrag.com/resources/builder/transparency-large (normal).png', "transparency-large%20(normal).png", path);
        //console.log("fixed transparent placeholder");
      }

      if (path === urls[urls.length - 1].local) {
        console.log("External deps have been downloaded");
        return;
      }
      file.close();
    });

  }
}

function ReplaceInFile(regexpFind, replace, filePath) {
    var contents = fs.readFileSync(filePath, 'utf8');
    var newContent = contents.replace(regexpFind, replace);
    fs.writeFileSync(filePath, newContent);
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

    if ( columns.trim() == "" ){
        //this means we need to select all columns
        columns = "*";
    }

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
        value = '@PARAM_' + condition.value.replace("'", "''");
      }
      let quotedValue = "'" + value + "'";
      let matchValue = condition.signOperator + " " + quotedValue;
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
          matchValue = "IS " + quotedValue;
      }
      else if (condition.signOperator == "is not")
      {
          matchValue = "IS NOT " + quotedValue;
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
    "redirect404toIndex": false,
    "acceptedFiles": "*.jpg|*.png|*.mp4|*.zip|*.jpeg|*.pdf|*.docx|*.xlsx|*.pptx",
    "HSTS": false,
    "maxRequestsPerMinutePerIP": -1,
    "CORS": {
        "access-control-allow-origin": "*"
    },
    "uploadFolder": "public/uploads/",
    "EmailProvider" : {
      "address" : "127.0.0.1",
      "port": 25,
      "login" : null,
      "password" : null,
      "isSSL": false,
    },
    "globalEnv" : {
      "APPID": appId,
      "APIKEY": apiKey
    },
    "db": {
      "MYSQL": {
          "dump": `./DB/db.sql`,
          "database": `${appId.replace(/-/g, "_")}`,
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
            try{
                object.apiEndpoints[`/api${pathToFunction}`].envVars = JSON.parse(func.envVars);
            }
            catch(ex){
                console.log(ex);
                console.log(pathToFunction);
            }
      }
      if (func.type !== "SELECT" && func.type !== "UPDATE" && func.type !== "DELETE" && func.type !== "INSERT" && func.type.slice(0,3) !== 'SQL') {
        try{
            delete object.apiEndpoints[`/api${pathToFunction}`].sourceCode;
            delete object.apiEndpoints[`/api${pathToFunction}`].mappingColumns;
            delete object.apiEndpoints[`/api${pathToFunction}`].outputColumns;
            delete object.apiEndpoints[`/api${pathToFunction}`].orderByColumn;
            delete object.apiEndpoints[`/api${pathToFunction}`].orderByDirection;
            delete object.apiEndpoints[`/api${pathToFunction}`].tableName;
            delete object.apiEndpoints[`/api${pathToFunction}`].whereConditions;
        }
        catch(ex){
            console.log(ex);
            console.log(func.type);
            console.log(pathToFunction);
        }
        
      }
    });
  }
  //let toWrite = JSON.stringify(object);
  let toWrite = JSON.stringify(object, null, 4);
    
  fs.writeFileSync(`./${baseFolder}/appconfig.json`, toWrite);
  return;
};

module.exports = { flattenFunctionList, appConfigJson, parseDirectory, isFolder, parseHtmlFiles, replaceLinks, downloadResources, deployCloudBackend, downloadDb };
