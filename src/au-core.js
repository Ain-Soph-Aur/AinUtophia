//在渲染器进程 (网页) 中。
const { ipcRenderer } = require('electron');

// console.log(ipcRenderer.sendSync('synchronous-message', 'ping')) // prints "pong"

let loadingStatus = document.getElementById('loading-status');
let loadingPage = document.getElementById('loading');

var nowServer;
var servers;
var selServerNo;

var files;

init();

function init() {
  ipcRenderer.send('startLoading', null);
  ipcRenderer.on('loadingStatus', (event, arg) => {
    loadingStatus.innerText = arg;
  });
  getServer();
  if (typeof nowServer !== 'undefined') {
    document.getElementById('current-server-name').innerText = nowServer.name;
    getFiles();
  }
  ipcRenderer.once('finishLoading', (event, arg) => {
    loadingPage.classList.add('fin');
    setTimeout(()=>{
      loadingPage.classList.add('collapse');
      document.body.classList.remove('loading');
    }, 500);
  });
}


function setNotify(msg) {
  alert(msg);
}

function clearServerNode(serverNodeList){
  while (serverNodeList.hasChildNodes()) {
    serverNodeList.removeChild(serverNodeList.firstChild);
  }
}

function setServerNode(i, more, serverNodeList) {
  let element = more ? undefined : servers[i];
  let serverNodeLi = document.createElement('li');
  let serverNode = document.createElement('a');
  serverNode.classList.add('server-instance');
  if (more) {
    serverNode.setAttribute('onclick', 'addServer()');
    serverNode.classList.add('add-more');
  } else {
    serverNode.setAttribute('onclick', 'selServer('+i+')');
    if (element.active) {
      serverNode.classList.add('active');
      nowServer = element;
      nowServer.id = i;
      selServerNo = i;
    }
  }
  let serverNodeLogoContainer = document.createElement('div');
  serverNodeLogoContainer.classList.add('server-logo');
  let serverNodeLogo = document.createElement('img');
  serverNodeLogo.setAttribute('src', more ? './assets/icons/plus.svg' : element.icon);
  serverNodeLogo.setAttribute('alt', more ? '发现更多' : element.name);
  serverNodeLogoContainer.appendChild(serverNodeLogo);
  serverNode.appendChild(serverNodeLogoContainer);
  let serverNodeName = document.createElement('div');
  serverNodeName.classList.add('server-name');
  serverNodeName.innerText = more ? '发现更多~' : element.name;
  serverNode.appendChild(serverNodeName);
  serverNodeLi.appendChild(serverNode);
  serverNodeList.appendChild(serverNodeLi);
}

function getServer(){
  let serverNodeList = document.getElementById('servers-list');
  servers = ipcRenderer.sendSync('getServer', 'all');
  clearServerNode(serverNodeList);
  let n = servers.length;
  for (var i = 0; i < n; i++) {
    setServerNode(i, false, serverNodeList);
  }
  setServerNode(-1, true, serverNodeList);
}

function addServer() {

}

function selServer(i) {
  let serverNodes = document.getElementsByClassName('server-instance');
  serverNodes[nowServer.id].classList.remove('active');
  if (selServerNo !== nowServer.id) {
    serverNodes[selServerNo].classList.remove('active');
  }
  selServerNo = i;
  serverNodes[i].classList.add('active');
}

function rmServer() {
  let serverNodes = document.getElementsByClassName('server-instance');
  serverNodes[selServerNo].classList.add('remove');
  servers[selServerNo].tobeRemoved = true;
  selServerNo = 0;
  // if (serverNodes.length > 1) {
  //   selServer(selServerNo === 0 ? 0 : selServerNo-1);
  // } else {
  //   selServerNo = -1;
  // }
}

function setServer() {
  if (selServerNo === -1 || typeof nowServer == 'undefined') {
    // 直接返回
    pageNav('settings', 'home');
    return;
  }
  servers[nowServer.id].active = false;
  servers[selServerNo].active = true;
  let err = ipcRenderer.sendSync('setServer', servers);
  if (err) {
    setNotify(err);
  } else {
    nowServer = servers[selServerNo];
    nowServer.id = selServerNo;
    setNotify('配置成功~\n当前服务器为 '+nowServer.name);
    getFiles();
    document.getElementById('current-server-name').innerText = nowServer.name;
    pageNav('settings', 'home');
    setTimeout(getServer(), 300);
  }
}

function getServerConf(serverid, serverName) {
  let serverConf = ipcRenderer.sendSync('getConf', [serverid, serverName]);
  return serverConf;
}

function clearFileNode(fileNodeList) {
  while (fileNodeList.hasChildNodes()) {
    fileNodeList.removeChild(fileNodeList.firstChild);
  }
}

function setFileNode(i, fileNodeList) {
  let fileNodeLi = document.createElement('li');
  fileNodeLi.classList.add(files[i].type);
  let fileNodeName = document.createElement('div');
  fileNodeName.classList.add('file-name');
  fileNodeName.innerText = files[i].name;
  fileNodeLi.appendChild(fileNodeName);
  let fileNodeType = document.createElement('div');
  fileNodeType.classList.add('file-type');
  fileNodeType.innerText = files[i].type;
  fileNodeLi.appendChild(fileNodeType);
  let fileNodeProgressWrapper = document.createElement('div');
  fileNodeProgressWrapper.classList.add('progress-bar', 'wrapper');
  let fileNodeProgress = document.createElement('div');
  fileNodeProgress.classList.add('bar');
  fileNodeProgressWrapper.appendChild(fileNodeProgress);
  fileNodeLi.appendChild(fileNodeProgressWrapper);
  fileNodeList.appendChild(fileNodeLi);
}

function getFiles() {
  let fileNodeList = document.getElementById('file-list');
  clearFileNode(fileNodeList);
  let serverConf = getServerConf(nowServer.id, nowServer.name);
  files = serverConf.files;
  let n = files.length;
  for (var i = 0; i < n; i++) {
    setFileNode(i, fileNodeList);
  }
}

function pageNav(from, to) {
  document.getElementById(from).classList.add('hidden');
  document.getElementById(to).classList.add('active');
  document.getElementById(to).classList.remove('hidden');

  setTimeout(()=>{
    document.getElementById(from).classList.remove('active');
  }, 300);
}

function ctclk(zone, event){
  switch (zone) {
    case 'control':
      ipcRenderer.send('window', event);
    break;
    case 'nav':
      let pages = event.split("|");
      pageNav(pages[0], pages[1]);
    break;
    case 'settings':
      switch (event) {
        case 'rm':
          rmServer();
        break;
        case 'confirm':
          setServer();
        break;
        case 'sync':
          getServer();
        break;
      }
    break;
  }
};