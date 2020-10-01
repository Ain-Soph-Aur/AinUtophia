// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron');

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 600,
    frame: false,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // 加载主页面
  mainWindow.loadFile('main.html');

  // 打开开发者工具
  mainWindow.webContents.openDevTools();

  // 事件处理
  ipcMain.on('window', (event, arg) => {
    switch (arg) {
      case 'close':
        mainWindow.close();
      break;
  
      case 'minimize':
        mainWindow.minimize();
      break;
    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  });

});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

let confFile = "./config/aucon.json";
var conf = new Object;

ipcMain.once('startLoading', (event, arg) => {
  // 开始检测本地配置
  if (fs.existsSync(confFile)) {
    event.reply('loadingStatus', '加载本地配置文件…');
    conf = JSON.parse(fs.readFileSync(confFile));
  } else {
    event.reply('loadingStatus', '初始化本地配置文件…');
    conf.version = 1;
    conf.servers = [];
    fs.writeFileSync(confFile, JSON.stringify(conf));
  }
  event.reply('loadingStatus', '加载完成~');
  setTimeout(()=>{
    event.reply('finishLoading', null)
  }, 1000);
});

ipcMain.on('getServer', (event, arg) => {
  // 读取服务器配置
  switch (arg) {
    case 'all':
      event.returnValue = conf.servers;
    break;
  }
});

ipcMain.on('setServer', (event, arg) => {
  // 保存服务器配置
  conf.servers = arg;
  let n = conf.servers.length;
  for (var i = 0; i < n; i++) {
    conf.servers[i].id = undefined;
    if (typeof conf.servers[i].tobeRemoved !== 'undefined') {
      conf.servers.splice(i,1);
    }
  }
  fs.writeFile(confFile, JSON.stringify(conf), (err)=>{
    event.returnValue = err;
  });
});

ipcMain.on('getConf', (event, arg) => {
  // 读取伺服器配置文件信息
  let serverId = arg[0];
  let serverFile = path.join('cache', 'server', arg[1]) + '.json';
  if (!fs.existsSync(serverFile)) {
    // 不存在则下载
    let err = getFile(conf.servers[serverId].url, serverFile);
    if (err) {
      let ret = new Object;
      ret.type = 'err';
      ret.err = err;
      event.returnValue = ret;
      return;
    }
  }
  let serverConfig = JSON.parse(fs.readFileSync(serverFile));
  if (typeof serverConfig.type == 'undefined' || serverConfig.type !== 'au-server') {
    // 说明是其他格式，需要特殊处理
  } else {
    event.returnValue = serverConfig;
  }
});

// 文件下载功能（暂未优化）
function getFile(url, targPath, md5=''){
  let fileStream = fs.createWriteStream(targPath);
  http.get(url, (res)=>{
    if(res.statusCode !== 200){
      cb(response.statusCode);
      return;
    }
  
    res.on('end', ()=>{
      if (md5) {
        let buffer = fs.readFileSync(targPath);
        let filehash = crypto.createHash('md5');
        filehash.update(buffer);
        return fsHash.digest('hex') == md5;
      }
      return true;
    });
  
    fileStream.on('finish', ()=>{
      fileStream.close();
    }).on('error', (err)=>{
      fs.unlink(targPath);
    });
  
    res.pipe(fileStream);
  });
}

