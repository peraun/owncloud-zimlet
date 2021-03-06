/**
/**
 * List view to display the content of the DAV navigator.
 * @param {DwtShell} parent
 * @param {string} appName
 * @param {OwnCloudApp} ocZimletApp
 * @param {OwnCloudCommons} ocCommons
 * @constructor
 */
function OwnCloudListView(
  parent,
  appName,
  ocZimletApp,
  davConnector,
  ocCommons
) {
  DwtListView.call(this, {
    parent: parent,
    headerList: this._getHeaderList()
  });

  this._appName = appName;
  this._ocZimletApp = ocZimletApp;
  this._davConnector = davConnector;
  this._ocCommons = ocCommons;
  this._listeners = {};

  this.createHeaderHtml(ZmItem.F_NAME);
  this.setSize("100%", "100%");

  this._listeners[ZmOperation.SEND_FILE]			  = (function(_this) { return function() {_this._sendFileListener.apply(_this, arguments); }; })(this);
  this._listeners[ZmOperation.SEND_FILE_AS_ATT]	= (function(_this) { return function() {_this._sendFileAsAttachmentListener.apply(_this, arguments); }; })(this);
  this._listeners[ZmOperation.DELETE]           = (function(_this) { return function() {_this._deleteListener.apply(_this, arguments); }; })(this);
  this._listeners[ZmOperation.RENAME_FILE]      = (function(_this) { return function() {_this._renameFileListener.apply(_this, arguments); }; })(this);
  this._listeners[ZmOperation.RENAME_FOLDER]    = (function(_this) { return function() {_this._renameFolderListener.apply(_this, arguments); }; })(this);
  this._listeners[ZmOperation.NEW_FOLDER]    = (function(_this) { return function() {_this._newFolderListener.apply(_this, arguments); }; })(this);
  this._listeners[ZmOperation.SAVE_FILE]        = (function(_this) { return function() {_this._saveFileListener.apply(_this, arguments); }; })(this);

  this.addActionListener(new AjxListener(this, this._listActionListener));
  this.addSelectionListener(new AjxListener(this, this._onItemSelected));
}

OwnCloudListView.prototype = new DwtListView();
OwnCloudListView.prototype.constructor = OwnCloudListView;

OwnCloudListView.prototype._handleColHeaderResize = function () {
   //Currently not implemented   
};

OwnCloudListView.prototype._mouseMoveListener = function () {
   //Currently not implemented   
};

OwnCloudListView.prototype._getHeaderList = function () {
  var headers = [];
  headers.push(new DwtListHeaderItem({
    field: ZmItem.F_TYPE,
    icon: "GenericDoc",
    width: 20,
    name: ZmMsg.icon
  }));
  headers.push(new DwtListHeaderItem({field: ZmItem.F_NAME, text: ZmMsg._name,sortable: ZmItem.F_NAME}));
  headers.push(new DwtListHeaderItem({
    field: ZmItem.F_FILE_TYPE,
    text: ZmMsg.type,
    width: ZmMsg.COLUMN_WIDTH_TYPE_DLV,
    sortable: ZmItem.F_FILE_TYPE
  }));
  headers.push(new DwtListHeaderItem({
    field: ZmItem.F_SIZE,
    text: ZmMsg.size,
    width: ZmMsg.COLUMN_WIDTH_SIZE_DLV,
    sortable: ZmItem.F_SIZE
  }));
  headers.push(new DwtListHeaderItem({
    field: ZmItem.F_DATE,
    text: ZmMsg.modified,
    width: 110,
    sortable: ZmItem.F_DATE
  }));
  return headers;
};

OwnCloudListView.prototype._sortColumn =
function(columnItem, bSortAsc) {
   var zimletInstance = appCtxt._zimletMgr.getZimletByName('tk_barrydegraaff_owncloud_zimlet').handlerObject;
   tk_barrydegraaff_owncloud_zimlet_HandlerObject.settings['sort_item'] = columnItem._field;
   if(bSortAsc == true)
   {
      tk_barrydegraaff_owncloud_zimlet_HandlerObject.settings['sort_asc'] = false;  
   }
   else
   {   
      tk_barrydegraaff_owncloud_zimlet_HandlerObject.settings['sort_asc'] = true;  
   }
   zimletInstance._appView.refreshViewPropfind();
}

OwnCloudListView.prototype._getCellContents = function (htmlArr, idx, item, field, colIdx, params) {

  if (field === ZmItem.F_TYPE) {

    if (item.isDirectory()) {
      htmlArr[idx++] = AjxImg.getImageHtml("Folder");
    } else {
      var type = ZmMimeTable.getInfo(item.getContentType());

      if (typeof type !== "undefined") {
        htmlArr[idx++] = AjxImg.getImageHtml(type.image);
      } else {
        htmlArr[idx++] = AjxImg.getImageHtml("GenericDoc");
      }
    }

  } else if (field === ZmItem.F_NAME) {

    htmlArr[idx++] = AjxStringUtil.htmlEncode(item.getName());

  } else if (field === ZmItem.F_FILE_TYPE) {

    if (item.isDirectory()) {
      htmlArr[idx++] = ZmMsg.folder;
    } else {
      if (typeof item.getContentType() !== "undefined") {
        htmlArr[idx++] = item.getContentType();
      } else {
        htmlArr[idx++] = ZmMsg.unknown;
      }
    }

  } else if (field === ZmItem.F_SIZE) {

    if (item.isDirectory()) {
      htmlArr[idx++] = "";
    } else {
      if(item.getContentLength() > -1)
      {
         htmlArr[idx++] = AjxUtil.formatSize(item.getContentLength());
      }
      else
      {
         //do not display size if dav server does not support it
         htmlArr[idx++] = "";
      }   
    }

  } else if (field === ZmItem.F_DATE) {

    if (typeof item.getModified() !== "undefined") {
      try {
         htmlArr[idx++] = AjxDateUtil.simpleComputeDateStr(item.getModified()) + " " + AjxDateUtil.computeTimeString(item.getModified());
      }
      catch(err){
         //do not display modified if dav server does not support it
         htmlArr[idx++] = "";
      }   
    } else {
       //do not display modified if dav server does not support it
      htmlArr[idx++] = "";
    }

  } else {

    htmlArr[idx++] = item.toString ? item.toString() : item;

  }
  return idx;
};

OwnCloudListView.prototype._resetOperations = function (parent, resource, resources) {
  var directoriesInvolved = false,
    operations = this._getActionMenuOps(),
    operationsEnabled = [],
    menuItem,
    i;

  parent.enableAll(false);
  parent.getMenuItem(ZmOperation.RENAME_FOLDER).setVisible(false);
  parent.getMenuItem(ZmOperation.NEW_FOLDER).setVisible(false);
  parent.getMenuItem(ZmOperation.RENAME_FILE).setVisible(false);
  parent.getMenuItem(ZmOperation.SAVE_FILE).setVisible(false);

  for (i = 0; i <  resources.length; i += 1) {
    if (resources[i].isDirectory()) {
      directoriesInvolved = true;
      break;
    }
  }

  operationsEnabled = [
    ZmOperation.SEND_FILE,
    ZmOperation.SEND_FILE_AS_ATT,
    ZmOperation.DELETE
  ];

  if (resources.length === 1) {     
    if (resource.isDirectory()) {
      var zimletInstance = appCtxt._zimletMgr.getZimletByName('tk_barrydegraaff_owncloud_zimlet').handlerObject; 
      if(zimletInstance._zimletContext.getConfig("owncloud_zimlet_disable_rename_delete_new_folder")=='true')
      {
         parent.getMenuItem(ZmOperation.DELETE).setVisible(false);   
         operationsEnabled.push(ZmOperation.RENAME_FOLDER);
         parent.getMenuItem(ZmOperation.RENAME_FOLDER).setVisible(false);
         operationsEnabled.push(ZmOperation.NEW_FOLDER);
         parent.getMenuItem(ZmOperation.NEW_FOLDER).setVisible(false);      
      }
      else
      {
         parent.getMenuItem(ZmOperation.DELETE).setVisible(true);   
         operationsEnabled.push(ZmOperation.RENAME_FOLDER);
         parent.getMenuItem(ZmOperation.RENAME_FOLDER).setVisible(true);
         operationsEnabled.push(ZmOperation.NEW_FOLDER);
         parent.getMenuItem(ZmOperation.NEW_FOLDER).setVisible(true);      
      }
    } else {
      parent.getMenuItem(ZmOperation.DELETE).setVisible(true);   
      operationsEnabled.push(ZmOperation.RENAME_FILE);
      operationsEnabled.push(ZmOperation.SAVE_FILE);
      parent.getMenuItem(ZmOperation.RENAME_FILE).setVisible(true);
      parent.getMenuItem(ZmOperation.SAVE_FILE).setVisible(true);
    }
  }
  else
  {
     parent.getMenuItem(ZmOperation.DELETE).setVisible(false);
  }

  parent.enable(operationsEnabled, true);

  if (directoriesInvolved) {
    parent.enable([
      ZmOperation.SEND_FILE_AS_ATT
    ], false);
  }
};

OwnCloudListView.prototype._listActionListener = function (ev) {
  var actionMenu = this.getActionMenu(ev.item, this.getSelection());
  this._resetOperations(actionMenu, ev.item, this.getSelection());
  actionMenu.popup(0, ev.docX, ev.docY);
};

OwnCloudListView.prototype.getActionMenu = function (resource, resources) {
  if (!this._actionMenu) {
    this._initializeActionMenu();
    this._resetOperations(this._actionMenu, resource, resources);
  }
  return this._actionMenu;
};

OwnCloudListView.prototype._initializeActionMenu = function () {

  if (this._actionMenu) {
    return;
  }

  var menuItems = this._getActionMenuOps();
  if (!menuItems) {
    return;
  }

  var menuParams = {
    parent: appCtxt.getShell(),
    menuItems: menuItems,
    context: this._appName,
    controller: this
  };
  this._actionMenu = new ZmActionMenu(menuParams);
  this._addMenuListeners(this._actionMenu);
};

OwnCloudListView.prototype._addMenuListeners = function (menu) {
  var menuItems = menu.opList;
  for (var i = 0; i < menuItems.length; i++) {
    var menuItem = menuItems[i];
    if (this._listeners[menuItem]) {
      menu.addSelectionListener(menuItem, this._listeners[menuItem], 0);
    }
  }
  menu.addPopdownListener(this._menuPopdownListener);
};

OwnCloudListView.prototype._getActionMenuOps = function() {
  return [
    ZmOperation.SAVE_FILE,
    ZmOperation.RENAME_FILE,
    ZmOperation.RENAME_FOLDER,
    ZmOperation.NEW_FOLDER,
    ZmOperation.DELETE,
    ZmOperation.SEP,
    ZmOperation.SEND_FILE,
    ZmOperation.SEND_FILE_AS_ATT,
  ];
};

OwnCloudListView.prototype._sendFileListener = function(ev) {
   var zimletInstance = appCtxt._zimletMgr.getZimletByName('tk_barrydegraaff_owncloud_zimlet').handlerObject;
   var owncloud_zimlet_disable_ocs_public_link_shares = zimletInstance._zimletContext.getConfig("owncloud_zimlet_disable_ocs_public_link_shares");   
   this.sharePassView = new DwtComposite(appCtxt.getShell()); 
   this.sharePassView.setSize("450", "100"); 
   var html = "<div style='width:450px; height: 100px; overflow-x: hidden; overflow-y: hidden;'><form id=\"ownCloudZimletShareTypeSelectorFrm\"><table style='width:100%'>";
   if(owncloud_zimlet_disable_ocs_public_link_shares != 'true')
   {
      html += '<tr><td><input type="radio" checked name="ownCloudZimletShareTypeSelector" value="public"></td><td>'+ZmMsg.shareWithPublic+'</td></tr>';
      html += '<tr><td></td><td><input placeholder="'+ (ZmMsg.optionalInvitees).toLowerCase() + " " + (ZmMsg.password).toLowerCase()+'" id="tk_barrydegraaff_owncloud_zimlet-sharedLinkPass" type="sharePassword"></td></tr>';
      html += "<tr><td colspan='2'><hr><br></td></tr>";
      html += '<tr><td><input type="radio" name="ownCloudZimletShareTypeSelector" value="internal"></td><td>'+ZmMsg.shareWithUserOrGroup+'</td></tr></table></form>';
   }
   else
   {
      html += '<tr><td><input type="radio" checked name="ownCloudZimletShareTypeSelector" value="internal"></td><td>'+ZmMsg.shareWithUserOrGroup+'</td></tr></table></form>';
   }
   this.sharePassView.getHtmlElement().innerHTML = html;
   this.sharePassDialog = new ZmDialog({title: ZmMsg.sendLink, view:this.sharePassView, parent:appCtxt.getShell(),  standardButtons:[DwtDialog.OK_BUTTON, DwtDialog.CANCEL_BUTTON], disposeOnPopDown: true});
   this.sharePassDialog.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._okSharePassListen, ev)); 
   this.sharePassDialog.setEnterListener(new AjxListener(this, this._okSharePassListen, ev));
   this.sharePassDialog.popup(); 
   if(owncloud_zimlet_disable_ocs_public_link_shares == 'true')
   {
       this._okSharePassListen(ev);
   }
};

OwnCloudListView.prototype._okSharePassListen = function(ev) {
 var zimletInstance = appCtxt._zimletMgr.getZimletByName('tk_barrydegraaff_owncloud_zimlet').handlerObject;
 var ownCloudZimletShareType = document.getElementById("ownCloudZimletShareTypeSelectorFrm").elements["ownCloudZimletShareTypeSelector"].value;
 if(document.getElementById('tk_barrydegraaff_owncloud_zimlet-sharedLinkPass'))
 {
    this.sharedLinkPass = document.getElementById('tk_barrydegraaff_owncloud_zimlet-sharedLinkPass').value;
 }
 else
 {
    this.sharedLinkPass = "";
 }   
 var
    /** @type {DavResource[]} */ resourcesToLink = this.getSelection(),
    /** @type {DavResource[]} */ resourcesToAttach = [],
    /** @type {string[]} */  resNames = [];   
    
  this.sharePassDialog.popdown();  
    
 if(ownCloudZimletShareType == 'public')
 {  
     for (var i = 0; i < resourcesToLink.length; i+= 1) {
       resNames.push(resourcesToLink[i].getName());
     }    
     this._ocCommons.getAttachments(
       resourcesToLink,
       resourcesToAttach,
       new AjxCallback(
         this,
         this._sendFilesListCbk,
         [resNames]
       ), this.sharedLinkPass
     ); 
  }
  else{
     var cc = AjxDispatcher.run("GetComposeController"),
       htmlCompose = appCtxt.get(ZmSetting.COMPOSE_AS_FORMAT) === ZmSetting.COMPOSE_HTML,
       extraBodyText = [];
   
     for (var i = 0; i < resourcesToLink.length; i+= 1) {
       extraBodyText.push(resourcesToLink[i].getName() + " : " + 'zimbradav:/'+encodeURI(resourcesToLink[i].getHref()));
     }
   
     cc._setView({
       action: ZmOperation.NEW_MESSAGE,
       inNewWindow: false,
       msg: new ZmMailMsg(),
       subjOverride: zimletInstance._zimletContext.getConfig("owncloud_zimlet_app_title") + " " + ZmMsg.share,
       extraBodyText: extraBodyText.join(htmlCompose ? "<br>" : "\n")
     });
  }
}

OwnCloudListView.prototype._sendFileAsAttachmentListener = function(ev) {
  var
    /** @type {DavResource[]} */ selectedResources = this.getSelection(),
    /** @type {DavResource[]} */ resourcesToLink = [],
    /** @type {DavResource[]} */ resourcesToAttach = [],
    /** @type {string[]} */  resNames = [];

  for (var i = 0; i < selectedResources.length; i += 1) {
    resNames.push(selectedResources[i].getName());
    if (selectedResources[i].isDirectory()) {
      resourcesToLink.push(selectedResources[i]);
    } else {
      resourcesToAttach.push(selectedResources[i]);
    }
  }

  this._ocCommons.getAttachments(
    resourcesToLink,
    resourcesToAttach,
    new AjxCallback(
      this,
      this._sendFilesListCbk,
      [resNames]
    )
  );
};

OwnCloudListView.prototype._sendFilesListCbk = function(resNames, urls, idsToAttach) {
  if(this.sharedLinkPass)
  {
     var passwordText = "("+this.sharedLinkPass+")";
  }
  else
  {
     var passwordText = "";
  }
       
  var cc = AjxDispatcher.run("GetComposeController"),
    htmlCompose = appCtxt.get(ZmSetting.COMPOSE_AS_FORMAT) === ZmSetting.COMPOSE_HTML,
    extraBodyText = [];

  for (var i = 0; i < urls.length; i+= 1) {
    if(urls[i].link.match(/http:\/\/|https:\/\//i))
    {
       extraBodyText.push(urls[i].name + " "+passwordText+" : " + urls[i].link);
    }
    else
    {
       ownCloudZimlet.prototype.status(urls[i].link,ZmStatusView.LEVEL_CRITICAL);  
    }   
  }
    
  if((extraBodyText.length > 0) || (idsToAttach.length > 0))
  {
    cc._setView({
      action: ZmOperation.NEW_MESSAGE,
      inNewWindow: false,
      msg: new ZmMailMsg(),
      subjOverride: new AjxListFormat().format(resNames),
      extraBodyText: extraBodyText.join(htmlCompose ? "<br>" : "\n")
    });
    cc.saveDraft(ZmComposeController.DRAFT_TYPE_MANUAL, [].concat(idsToAttach).join(","));
  }  
};

OwnCloudListView.prototype._onItemSelected = function(ev) {
  var item = ev.item;

  var davResource = this.getSelection()[0];
  
  //check if document conversion is available on the server
  var xhr = new XMLHttpRequest();
  xhr.open("POST", '/service/extension/dav_download/');
  xhr.send();
  var _this = this;
  xhr.onload = function(e) 
  {     
     if(xhr.responseText == 'true')
     {
        var regex = /\.pdf$|\.odt$|\.ods$|\.odp$|\.mp4$|\.webm$|\.jpg$|\.jpeg$|\.png$|\.txt$|\.doc$|\.docx$|\.xls$|\.xlsx$|\.ppt$|\.pptx$|\.djvu$/i;
     }
     else
     {
        var regex = /\.pdf$|\.mp4$|\.webm$|\.jpg$|\.jpeg$|\.png$|\.txt$/i;
     }
     if(!item.isDirectory() && davResource._href.match(regex))
     {
        _this._davConnector.getDownloadLink(
          davResource.getHref(),
          new AjxCallback(_this, _this.preview, [davResource])
        );
     }
  }

  var zimletInstance = appCtxt._zimletMgr.getZimletByName('tk_barrydegraaff_owncloud_zimlet').handlerObject;
  var appHeight = (Math.max( document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight )-110);
  var appWidth = (Math.max( document.body.scrollWidth, document.body.offsetWidth, document.documentElement.clientWidth, document.documentElement.scrollWidth, document.documentElement.offsetWidth )-document.getElementById('zov__main_'+zimletInstance.ownCloudTab).style.width.replace('px','')-15);
  this.setSize(appWidth/2+"px",appHeight+"px");
  document.getElementById('WebDAVPreview').style.width=appWidth/2+'px';
  document.getElementById('WebDAVPreview').style.height=appHeight+'px';
  if (ev.detail === DwtListView.ITEM_DBL_CLICKED) {
    if (item.isDirectory()) {
      zimletInstance._appView._currentPath = ev.item._href;
      zimletInstance._appView.refreshViewPropfind();
    } else {
      this._saveFileListener(ev);
    }
  }
};

OwnCloudListView.prototype.preview = function(davResource, token) {
  var contentType = ""
   //Not all dav servers implement content/type correctly, so use them accoring to extension
   switch (davResource._href) {
     case (davResource._href.match(/\.djvu$/i) || {}).input:
          contentType = 'image/vnd.djvu';
       break;
     case (davResource._href.match(/\.jpeg$/i) || {}).input:
          contentType = 'image/jpeg';
       break;      
     case (davResource._href.match(/\.jpg$/i) || {}).input:
          contentType = 'image/jpeg';
       break;      
     case (davResource._href.match(/\.pdf$/i) || {}).input:
          contentType = 'application/pdf';
       break;       
     case (davResource._href.match(/\.odt$/i) || {}).input:
          contentType = 'application/vnd.oasis.opendocument.text';
       break;
     case (davResource._href.match(/\.ods$/i) || {}).input:
          contentType = 'application/vnd.oasis.opendocument.spreadsheet';
       break;
     case (davResource._href.match(/\.odp$/i) || {}).input:
          contentType = 'application/vnd.oasis.opendocument.presentation';
       break;
     case (davResource._href.match(/\.mp4$/i) || {}).input:
          contentType = 'video/mp4';
       break;
     case (davResource._href.match(/\.webm$/i) || {}).input:
          contentType = 'video/webm';
       break;
     case (davResource._href.match(/\.png$/i) || {}).input:
          contentType = 'image/png';
       break;
     case (davResource._href.match(/\.txt$/i) || {}).input:
          contentType = 'text/plain';
       break;
     case (davResource._href.match(/\.doc$/i) || {}).input:
          contentType = 'application/vnd.ms-word';
       break;
     case (davResource._href.match(/\.docx$/i) || {}).input:
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
       break;
     case (davResource._href.match(/\.xls$/i) || {}).input:
          contentType = 'application/vnd.ms-excel';
       break;
     case (davResource._href.match(/\.xlsx$/i) || {}).input:
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
       break;
     case (davResource._href.match(/\.ppt$/i) || {}).input:
          contentType = 'application/vnd.ms-powerpoint';
       break;
     case (davResource._href.match(/\.pptx$/i) || {}).input:
          contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
       break;
     default:
          contentType = davResource.getContentType();
       break;
   }  
  
  var zimletInstance = appCtxt._zimletMgr.getZimletByName('tk_barrydegraaff_owncloud_zimlet').handlerObject;
  var href = token + "&name=" + encodeURIComponent(davResource.getName()) + "&contentType=" + contentType + "&inline=true";
  if(davResource._href.match(/\.txt$/i))
  {
     document.getElementById('WebDAVPreview').src=href;
  }
  else if (davResource._href.match(/\.pdf$|\.odt$|\.ods$|\.odp$|\.mp4$|\.webm$|\.jpg$|\.jpeg$|\.png$|\.doc$|\.docx$|\.xls$|\.xlsx$|\.ppt$|\.pptx$|\.djvu$/i))
  {
     document.getElementById('WebDAVPreview').src=zimletInstance.getResource('pixel.png');
     setTimeout(function(){ document.getElementById('WebDAVPreview').src=zimletInstance.getResource('/ViewerJS')+'/#'+href; }, zimletInstance._zimletContext.getConfig("owncloud_zimlet_preview_delay"));
  }
  else
  {
     //This condition occurs only when clicking internal user shares
     var regexp = /.*name=(.*?)&contentType.*$/g;
     var match = regexp.exec(href);
     document.getElementById('WebDAVPreview').contentDocument.write('<button onclick="+window.location.assign(\''+href+'\');this.parentNode.removeChild(this);">'+ZmMsg.download + " " + decodeURIComponent(match[1])+'</button>');
  }
};


OwnCloudListView.prototype._saveFileListener = function(ev) {
  var davResource = this.getSelection()[0];
  this._davConnector.getDownloadLink(
    davResource.getHref(),
    new AjxCallback(this, this.downloadFromLink, [davResource])
  );
};

OwnCloudListView.prototype._deleteListener = function(ev) {
  var davResource = this.getSelection()[0],
    deleteDialog = new DwtMessageDialog({
      parent: appCtxt.getShell(),
      buttons: [DwtDialog.YES_BUTTON, DwtDialog.NO_BUTTON]
    });
  deleteDialog.setMessage(
    (ZmMsg.confirmDeleteForever).replace(/{0,.*,1#|\|2#.*\}/g,""),
    DwtMessageDialog.WARNING_STYLE,
    ZmMsg.remove + " " + davResource.getName()
  );
  deleteDialog.setButtonListener(DwtDialog.YES_BUTTON, new AjxListener(this, this._deleteCallback, [davResource, deleteDialog]));
  deleteDialog.addEnterListener(new AjxListener(this, this._deleteCallback, [davResource, deleteDialog]));
  deleteDialog.popup();
};

OwnCloudListView.prototype._deleteCallback = function(davResource, dialog) {
  var zimletInstance = appCtxt._zimletMgr.getZimletByName('tk_barrydegraaff_owncloud_zimlet').handlerObject;
  this._davConnector.rm(
    davResource.getHref(),
    new AjxCallback(this, function(davResource, dialog, response) {
      dialog.popdown();
      zimletInstance._appView.refreshViewPropfind();           
    }, [davResource, dialog]),
    new AjxCallback(this, function(davResource, dialog, response) {
      dialog.popdown();
      zimletInstance._appView.refreshViewPropfind();      
    }, [davResource, dialog])
  );
};

OwnCloudListView.prototype._renameFileListener = function() {
  var renameFileDialog = new DwtDialog({parent: appCtxt.getShell()}),
    folder = this.getSelection()[0],
    composite = new DwtComposite({ parent: renameFileDialog }),
    label,
    input;

  renameFileDialog.setView(composite);

  label = new DwtLabel({
    parent: composite
  });
  label.setText(ZmMsg.newName + ":");

  input = new DwtInputField({
    parent: composite,
    initialValue: folder.getName()
  });
  renameFileDialog.setTitle(ZmMsg.rename + ": " + folder.getName());
  renameFileDialog.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._renameFileCallback, [folder, input, renameFileDialog]));
  renameFileDialog.addEnterListener(new AjxListener(this, this._renameFileCallback, [folder, input, renameFileDialog]));
  //add tab group and focus on the input field
  renameFileDialog._tabGroup.addMemberBefore(input,renameFileDialog._tabGroup.getFirstMember());
  renameFileDialog._tabGroup.setFocusMember(input);  
  renameFileDialog.popup();
};

OwnCloudListView.prototype._renameFileCallback = function(file, input, dialog, ev) {
  var zimletInstance = appCtxt._zimletMgr.getZimletByName('tk_barrydegraaff_owncloud_zimlet').handlerObject;  
  var inputValue = ownCloudZimlet.prototype.sanitizeFileName(input.getValue());
  if (inputValue === file.getName()) { return; }
  dialog.getButton(DwtDialog.OK_BUTTON).setEnabled(false);
  dialog.getButton(DwtDialog.CANCEL_BUTTON).setEnabled(false);

  this._davConnector.move(
    file.getHref(),
    file.getPath() + "/" + inputValue,
    false,
    new AjxCallback(this, function(dialog, result) {
      zimletInstance._appView.refreshViewPropfind();
      dialog.popdown();      
      if (result === true) {
      } else {
      }
    }, [dialog]),
    new AjxCallback(this, function(dialog) {
      zimletInstance._appView.refreshViewPropfind();
      dialog.popdown();      
    }, [dialog])
  );
};

OwnCloudListView.prototype._renameFolderListener = function(ev) {
  var renameFolderDialog = new DwtDialog({parent: appCtxt.getShell()}),
    folder = this.getSelection()[0],
    composite = new DwtComposite({ parent: renameFolderDialog }),
    label,
    input;

  renameFolderDialog.setView(composite);

  label = new DwtLabel({
    parent: composite
  });
  label.setText(ZmMsg.newName + ":");

  input = new DwtInputField({
    parent: composite,
    initialValue: folder.getName()
  });
  renameFolderDialog.setTitle(ZmMsg.renameFolder + ": " + folder.getName());
  renameFolderDialog.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._renameFolderCallback, [folder, input, renameFolderDialog]));
  renameFolderDialog.addEnterListener(new AjxListener(this, this._renameFolderCallback, [folder, input, renameFolderDialog]));
  //add tab group and focus on the input field
  renameFolderDialog._tabGroup.addMemberBefore(input,	renameFolderDialog._tabGroup.getFirstMember());
  renameFolderDialog._tabGroup.setFocusMember(input);  
  renameFolderDialog.popup();
};

OwnCloudListView.prototype._renameFolderCallback = function(folder, input, dialog, ev) {
  var zimletInstance = appCtxt._zimletMgr.getZimletByName('tk_barrydegraaff_owncloud_zimlet').handlerObject;  
  var inputValue = ownCloudZimlet.prototype.sanitizeFileName(input.getValue());
  if (inputValue === folder.getName()) { return; }
  dialog.getButton(DwtDialog.OK_BUTTON).setEnabled(false);
  dialog.getButton(DwtDialog.CANCEL_BUTTON).setEnabled(false);

  this._davConnector.move(
    folder.getHref(),
    folder.getPath() + "/" + inputValue + "/",
    false,
    new AjxCallback(this, function(dialog, result) {
      zimletInstance._appView.refreshViewPropfind();
      dialog.popdown();      
      if (result === true) {
      } else {
      }
    }, [dialog]),
    new AjxCallback(this, function(dialog) {
      zimletInstance._appView.refreshViewPropfind();
      dialog.popdown();
    }, [dialog])
  );
};

OwnCloudListView.prototype._newFolderListener = function(ev) {
  var newFolderDialog = new DwtDialog({parent: appCtxt.getShell()}),
    folder = this.getSelection()[0],
    composite = new DwtComposite({ parent: newFolderDialog }),
    label,
    input;

  newFolderDialog.setView(composite);

  label = new DwtLabel({
    parent: composite
  });
  label.setText(ZmMsg.newFolder + ":");

  input = new DwtInputField({
    parent: composite
  });
  newFolderDialog.setTitle(ZmMsg.newFolder);
  newFolderDialog.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._newFolderCallback, [folder, input, newFolderDialog]));
  newFolderDialog.addEnterListener(new AjxListener(this, this._newFolderCallback, [folder, input, newFolderDialog]));
  //add tab group and focus on the input field
  newFolderDialog._tabGroup.addMemberBefore(input,	newFolderDialog._tabGroup.getFirstMember());
  newFolderDialog._tabGroup.setFocusMember(input);  
  newFolderDialog.popup();
};

OwnCloudListView.prototype._newFolderCallback = function(folder, input, dialog, ev) {
  var zimletInstance = appCtxt._zimletMgr.getZimletByName('tk_barrydegraaff_owncloud_zimlet').handlerObject;
  var inputValue = ownCloudZimlet.prototype.sanitizeFileName(input.getValue());
  if (inputValue === folder.getName()) { return; }
  dialog.getButton(DwtDialog.OK_BUTTON).setEnabled(false);
  dialog.getButton(DwtDialog.CANCEL_BUTTON).setEnabled(false);

  this._davConnector.mkcol(
    "/"+(folder.getHref() + inputValue).replace(tk_barrydegraaff_owncloud_zimlet_HandlerObject.settings['owncloud_zimlet_server_path'], ""),
    new AjxCallback(this, function(dialog, result) {
      dialog.popdown();
      zimletInstance._appView.refreshViewPropfind();      
    }, [dialog])
  );  
};

OwnCloudListView.prototype.downloadFromLink = function(davResource, token) {
   var href = token + "&name=" + encodeURIComponent(davResource.getName()) + "&contentType=" + davResource.getContentType();
   if(!document.getElementById('OwnCloudListViewhiddenDownloader'))
   {
      var iframe = document.createElement('iframe');
      iframe.id = "OwnCloudListViewhiddenDownloader";
      iframe.style.visibility = 'hidden';  
      iframe.style.width = '0px';
      iframe.style.height = '0px';  
      document.body.appendChild(iframe);
   }
   document.getElementById('OwnCloudListViewhiddenDownloader').src=href;
};
