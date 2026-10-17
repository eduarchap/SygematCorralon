#include "(CurrentProject)/Documentos/General/sjcl.js"
#include "(CurrentProject)/Documentos/ajax.js"

importClass( "VFile" );
importClass( "VProcess" );

var charsToEncode = /[\u007f-\uffff]/g;

/**
 * Cleans a stringifyed JSON object
 * @param {object} args a JSON object to be escaped so it can be sent into http headers
 */
function httpHeaderSafeJson(args) {
  return JSON.stringify(args).replace(charsToEncode, function (c) {
    return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4);
  });
}
/**
 * Gets the last item from a URI
 * @param  {string} path a file or url path
 */
function getLastItem(path) {
	return path.split("/")[path.split("/").length-1];
}

/**
 * Gets the list of files from a particular folder or the root.
 * @param {string} parentId the parent folder google id
 * @param {function} callback function to be called after the funciona gets the list of files from Drive
 */
function getRootFiles(parentId, callback) {
	var base_args = arguments;
	var datos = { corpora: "user",
				  orderBy: "createdTime desc",
				  pageSize: 500,
				  spaces: "drive",
				  fields: "*",
				  q: ("trashed = false and '" + getLastItem(parentId) + "' in parents") };

	$.ajax({
			type: 	 "GET",
			url:  	 "https://www.googleapis.com/drive/v3/files",
			headers: { "Authorization": ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_G_DRI_AUT_TOK")) },
			data: 	 datos,
			responseType: "json",
			success: function(data) {
					 if ( typeof(callback) == "function" ) {
						callback(data.files);
					 } else {
						addData(data.files);
					 }
			},
			error: function(error, code) {
				if ( (code == 401) || ((code == 0) && ( JSON.stringify(error) == '""' )) ) { refreshToken(getRootFiles, [parentId, callback]); return; }

				alert("No pueden obtenerse los archivos: " + code);
			}
	});
}

/**
 * Inserts into the queue the list of files to be async downloaded
 * @param {Array} entries The list of files to be downloaded
 * @param {string} to Path so be used when the file gets downloaded
 */
function entriesToQueue( entries, to ) {
	var z = entries.length;
	for (i=0; i < z; i++ ) {
		var file  = entries[i],
			addProcess = new VProcess(theRoot),
			esFolder = file.mimeType == "application/vnd.google-apps.folder";

		// Files directly created on Google Drive aren't downloadable they have to be exported
		if ( file.mimeType.match(/google-apps/) && esFolder == false ) { continue; }

		addProcess.setProcess("sygemat_corralon_app/ADD_COL");
		addProcess.setVar("RUT_DES", file.id);
		addProcess.setVar("NAME", file.name);
		addProcess.setVar("TO", to);
		addProcess.setVar("TIP", (esFolder ? "1" : "2"));
    	addProcess.setVar("PLA", "drive");

		if ( !esFolder && file.size ) {
			addProcess.setVar("TAM", file.size);
		}
		addProcess.exec();
	}
}

/**
 * Inserts files into the FILES table so the explorer window can show them
 * @param {Array} entries List of files that came from google drive
 */
function addData(entries) {
	var z = entries.length;
	if ( theRoot.beginTrans("Añadir ficheros") ) {

		for (i=0; i < z; i++ ) {
			 var file  = entries[i],
				 nFile = new VRegister(theRoot),
				 esFolder = file.mimeType == "application/vnd.google-apps.folder";

			 nFile.setTable("sygemat_corralon_dat/DOC_EXP_W");
			 nFile.setField("NAME", file.name);
			 nFile.setField("TIP", (esFolder ? "1" : "2"));
			 nFile.setField("RUT", file.id);

			 if ( esFolder == false && file.size ) {
				nFile.setField("TAM", file.size);
				nFile.setField("FCH", file.modifiedTime); 
			 }
			 nFile.setField("JSON", JSON.stringify(file));
			 nFile.setField("DOW", (file.mimeType.match(/google-apps/) == null || esFolder) );

			 nFile.addRegister();
			 nFile = null;
			 file  = null;
		}

	theRoot.commitTrans();
	} else { alert("No funciona"); }
}

/**
 * Uploads a file to a Google Drive Folder
 * @param {string} file disc path to the file that is going to be uploaded
 * @param {string} parent_id the id of the folder where the file is going to be uploaded
 * @param {function} callback a function to call after the file got uploaded
 */
function fileUpload( file, parent_id, callback ) {
	var fileToUp = readFile( file ),
		contentType =  $.extensions[file.split(".").pop()] || "application/octet-stream";

	if ( fileToUp.name !== "empty" ) {
		$.ajax({
			type: 	 "POST",
			url: 	 "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
			headers: { "Authorization": ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_G_DRI_AUT_TOK")),
					   "Content-Type": "application/json",
					   "X-Upload-Content-Type": contentType,
					   "X-Upload-Content-Length": fileToUp.array.length
			},
			data: {name: fileToUp.name, parents: [parent_id]},
			success: function(data, codigo, headers) {
					 var uploadUrl = headers.Location;
					 if (undefined === uploadUrl){uploadUrl = headers.location;}
					 
					 $.ajax({
						type: "POST",
						url: uploadUrl,
						headers: { "Authorization": ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_G_DRI_AUT_TOK")),
								   "Content-Type":   contentType,
								   "Content-Length": fileToUp.array.length
						},
						body: fileToUp.array,
						responseType: "json",
						success: function(data, codigo) {
								 if ( typeof(callback) == "function" ) { callback(data); }
						},
						error: function(data, code) {
								 theApp.setGlobalVar("sygemat_corralon_dat/WOR_UPL", 0);		 
						}
					 });
			},
			error: function(error, code) {
					if ( (code == 401) || ((code == 0) && ( JSON.stringify(error) == '""' )) ) { refreshToken(fileUpload, [file, parent_id, callback]); return; }
					alert("Error '" + error + "' code: " + code);
					theApp.setGlobalVar("sygemat_corralon_dat/WOR_UPL", 0);
			}
		});
	} else {
			alert("Error: el archivo '" + file + "' no se encuentra");
	}
}

/**
 * Pasa a texto la respuesta de error (con arraybuffer llega como bytes)
 * @param {*} data respuesta del servidor
 */
function respToText(data) {
	try {
		if ( data === undefined || data === null ) { return "(sin respuesta)"; }
		if ( typeof(data) == "string" ) { return data; }
		if ( typeof(data.toString) == "function" ) {
			var s = data.toString();
			if ( s && s !== "[object Object]" ) { return s.substring(0, 1000); }
		}
		return JSON.stringify(data).substring(0, 1000);
	} catch (e) { return "(no se pudo leer la respuesta)"; }
}

/**
 * Muestra / actualiza el aviso de descarga en la barra de estado
 * @param {string} texto leyenda junto a la barra de progreso
 * @param {number} porcentaje valor de 0 a 100
 */
function avisoDescarga(texto, porcentaje) {
	try {
		theRoot.initProgressBar();
		theRoot.setTitle(texto);
		theRoot.setProgress(porcentaje);
	} catch (e) { }
}

/**
 * Oculta el aviso de descarga de la barra de estado
 */
function finAvisoDescarga() {
	try { theRoot.endProgressBar(); } catch (e) { }
}

/**
 * Downloads a selected file to a folder in the local disk
 * @param {string} path the google id of the file to be downloaded
 * @param {string} to the path on disk where the file should be written to
 * @param {string} file_name the name of the file once is downloaded
 * @param {number} intento numero de reintento (uso interno, corta el bucle de refreshToken)
 */
function DownloadToFile( path, to, file_name, intento ) {
		intento = intento || 0;

		if ( theApp.sysInfo().getOs() < 200 ) {
			to = to.match(/\\$/) ? to : ( to + "\\" );
		} else {
			to = to.match(/\/$/) ? to : ( to + "/" );
		}

		var fileName = path.split("/")[path.split("/").length - 1 ],
			fullPath = to + file_name;

		avisoDescarga( (intento == 0 ? "Descargando " : "Reintentando descarga de ") + file_name + " desde Google Drive...", (intento == 0 ? 10 : 50) );

		$.ajax({
			type: "GET",
			url : ("https://www.googleapis.com/drive/v3/files/" + path),
			data: {alt: "media"},
			headers : {"Authorization": ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_G_DRI_AUT_TOK")) },
			responseType: "arraybuffer",
			timeout: 25, // 25 s por intento (antes 30 * 60 = 30 minutos): peor caso ~1 min y muestra el error
			success: function(data, status) {
						avisoDescarga("Guardando " + file_name + "...", 90);
						var fi = new VFile( fullPath );
						if ( fi.open( VFile.OpenModeWriteOnly | VFile.OpenModeTruncate) ) {
							fi.write(data);
							fi.close();
						}
						finAvisoDescarga();
			},
			error: function(data, code) {
						// Un solo reintento renovando el token: antes un code 0 (timeout, red) entraba en bucle infinito
						if ( intento < 1 && ( (code == 401) || ((code == 0) && ( JSON.stringify(data) == '""' )) ) ) {
							avisoDescarga("Renovando acceso a Google Drive...", 40);
							refreshToken(DownloadToFile, [path, to, file_name, intento + 1]);
							return;
						}

						finAvisoDescarga();
						alert("Error descargando de Google Drive\nid: " + path + "\ncode: " + code + "\n" + respToText(data));
						theApp.setGlobalVar("sygemat_corralon_dat/WOR", 0);
			}
		});	
}

/**
 * Deletes a file from Google drive
 * @param {string} path the google id of the file that is going to be deleted
 */
function deleteFile(path) {
	if ( path !== undefined ) {
		$.ajax({
				type: 	 "DELETE",
				url: 	 "https://www.googleapis.com/drive/v3/files/" + path,
				headers : {"Authorization": ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_G_DRI_AUT_TOK")) },
				timeout: (30 * 60),
				responseType: "json",
				success: function(data, code) {
				},
				error: function(data, code) {
					if ( (code == 401) || ((code == 0) && ( JSON.stringify(data) == '""' )) ) { refreshToken(deleteFile, [path]); return; }
					alert("Error: " + JSON.stringify(data));
				}
		});
	}
}


/**
 * Creates a folder in he google tree
 * @param {string} name name of the folder to be created
 * @param {*} parentId the google Id of the parent folder for the one that's going to be created
 */
function createFolder(name, parentId) {
	if ( name !== undefined ) {
		$.ajax({
				type: 	 "POST",
				url: 	 "https://www.googleapis.com/drive/v3/files",
				headers : {"Authorization": ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_G_DRI_AUT_TOK")),
						   "Content-Type": "application/json"
				},
				data: {name: name, 'mimeType': 'application/vnd.google-apps.folder', parents: [parentId]},
				timeout: (30 * 60),
				responseType: "json",
				success: function(data, codigo) {
				},
				error: function(data, code) {
					if ( (code == 401) || ((code == 0) && ( JSON.stringify(data) == '""' )) ) { refreshToken(createFolder, [name, parentId]); return; }
					alert("Error: Ha ocurrido un error al crear el directorio \n mensaje: \n" + JSON.stringify(data));
				}
		});
	}
}

/**
 * Moves a file from one folder to another
 * @param {string} parentIdFrom the Id of the parent folder where the file is going to be cut off
 * @param {string} parentIdTo the Id of the parent folder where the file is going the be added
 * @param {string} fileId the Id of the file that's going te be moved
 */
function move(parentIdFrom, parentIdTo, fileId) {
	if ( parentIdFrom == undefined || parentIdTo == undefined ) { return; }

	$.ajax({
			type: 	 "PATCH",
			url: 	 ("https://www.googleapis.com/drive/v3/files/" + fileId),
			headers: {"Authorization": ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_G_DRI_AUT_TOK")),
					   "Content-Type": "application/json"
			},
			urlParams: {addParents: parentIdTo, removeParents: parentIdFrom, fields: "parents"},
			timeout: (30 * 60),
			responseType: "json",
			success: function(data, codigo) {
				//alert("Folder creado exitosamente!");
			},
			error: function(data, code) {
				if ( (code == 401) || ((code == 0) && ( JSON.stringify(data) == '""' )) ) { refreshToken(move, [parentIdFrom, parentIdTo, fileId]); return; }
				alert("Error: Ha ocurrido un error al crear el directorio \n mensaje: \n" + JSON.stringify(data));
			}
	});
}

/**
 * Copies a file from one folder to another
 * @param {string} parentIdTo the Id of the parent folder where the file is going the be added
 * @param {string} fileId the Id of the file that's going te be moved
 * @param {string} fileName the Name for the copied file
 */
function copy(parentIdTo, fileId, fileName) {
		if ( fileId == undefined || parentIdTo == undefined ) { return; }

		$.ajax({
			type: 	 "POST",
			url: 	 ("https://www.googleapis.com/drive/v3/files/" + fileId + "/copy"),
			headers: {"Authorization": ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_G_DRI_AUT_TOK")),
					   "Content-Type": "application/json"
			},
			data: {parents: [parentIdTo], name: fileName},
			timeout: (30 * 60),
			responseType: "json",
			success: function(data, codigo) {
				//alert("Folder creado exitosamente!");
			},
			error: function(data, code) {
				if ( (code == 401) || ((code == 0) && ( JSON.stringify(data) == '""' )) ) { refreshToken(copy, [parentIdTo, fileId, fileName]); return; }
				alert("Error: Ha ocurrido un error al crear el folder \n mensaje: \n" + JSON.stringify(data));
			}		
		});
}

/**
 * Searches files that match a word(s) in a particular folder
 * @param {string} parentId the google id of the folder where the search is going to be performed
 * @param {string} term the word(s) to be searched
 * @param {function} callback a funciton to be called after we get the results from the search
 */
function search(parentId, term, callback) {
	var wordQuery = _.map(term.trim().split(/\W/), function(word) { return("name contains '" + word + "'"); }).join(" and "),
		datos 	  = { corpora: "user",
					  orderBy: "createdTime desc",
					  pageSize: 500,
					  spaces:  "drive",
					  fields:  "*",
					  q: ("trashed = false and " + wordQuery)
					};

	$.ajax({
			type: 	 "GET",
			url:  	 "https://www.googleapis.com/drive/v3/files",
			headers: { "Authorization": ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_G_DRI_AUT_TOK")) },
			data: 	 datos,
			responseType: "json",
			success: function(data) {
					 if ( typeof(callback) == "function" ) {
						callback(data.files);
					 } else {
						addData(data.files);
					 }
			},
			error: function(error, code) {
				if ( (code == 401) || ((code == 0) && ( JSON.stringify(error) == '""' )) ) { refreshToken(search, [parentId, term, callback]); return; }
				alert("No pueden obtenerse los archivos: " + code);
			}
	});	
}


/**
 * Extracts the file shareable link from the JSON
 * @param {object} json the entire JSON objecto that represents the file
 */
function getSharedLink(json) {
	return(JSON.parse(json).webViewLink);
}


/**
 * Refresh the access token when it expires and retries the passed function
 * @param {function} callback the funcion that is going the be retryed once the token gets refreshed
 * @param {Array} params the list of params that the callback funcion needs
 */
function refreshToken(callback, params) {
	$.ajax({
			type: "POST",
			url: "https://www.googleapis.com/oauth2/v4/token",
			data: {
				  client_id:     theApp.globalVarToString("sygemat_corralon_dat/DOC_G_DRI_CLI_ID"),
				  client_secret: theApp.globalVarToString("sygemat_corralon_dat/DOC_G_DRI_CLI_SEC"),
				  refresh_token: theApp.globalVarToString("sygemat_corralon_dat/DOC_G_DRI_AUT_REF_TOK"),
				  grant_type:    "refresh_token"
			},
			responseType: "json",
			success: function(data) {
				data.refresh_token = theApp.globalVarToString("sygemat_corralon_dat/DOC_G_DRI_AUT_REF_TOK");
				theApp.setGlobalVar("sygemat_corralon_dat/DOC_G_DRI_AUT_TOK", data.access_token);

				var toEncript = data.access_token + "####" + data.refresh_token,
					toStore   = sjcl.encrypt("mtjhShZd", toEncript),
					to        = theApp.clientCachePath();

				if ( theApp.sysInfo().getOs() < 200 ) {
					to = to.match(/\\$/) ? to : ( to + "\\");
				} else {
					to = to.match(/\/$/) ? to : ( to + "/" );
				}

				var path = to + "access.json";

				var fi = new VTextFile(path);
				if ( fi.open( VFile.OpenModeWriteOnly | VFile.OpenModeTruncate) ) {
					fi.write(toStore);
					fi.close();
				}

				callback.apply(null, _.map(Object.keys(params), function(key) { return(params[key]); }));
			},
			error: function(data, code) {
				finAvisoDescarga();
				theApp.setGlobalVar("sygemat_corralon_dat/DOC_G_DRI_AUT_TOK", "");
				theApp.setGlobalVar("sygemat_corralon_dat/DOC_G_DRI_AUT_REF_TOK", "");
			}

	});
}

/**
 * Makes a folder/file public available
 * @param {string} fileFolderId Google id of the file or folder that's going to be public
 * @param {function} callback a function to be called once the file/folders  get published
 */
function makePublic(fileFolderId, callback) {
	$.ajax({
			type: "POST",
			url:  ("https://www.googleapis.com/drive/v3/files/" + fileFolderId + "/permissions"),
			headers: { "Authorization": ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_G_DRI_AUT_TOK")),
					   "Content-Type":   "application/json"
			},
			responseType: "json",
			data: {role: "reader", type: "anyone"},
			success: function(permission) {
				     if (typeof(callback) == "function") { callback(permission); }
			},
			error: function(error, code) {
				if ( (code == 401) || ((code == 0) && ( JSON.stringify(error) == '""' )) ) { refreshToken(makePublic, [fileFolderId]); return; }
				alert("No se puede hacer público el archivo: " + code + "\n mensaje: \n" + JSON.stringify(error));
			}
	});
}

/**
 * Grants file/folder access to a specific user
 * @param {string} fileFolderId Google id for file or folder thats going the shared with a user
 * @param {string} email Email for the user that's going to have access to the file/folder
 * @param {function} callback function to be called once the file gets shared
 */
function grantAccessTo(fileFolderId, email, callback) {
	$.ajax({
			type: "POST",
			url:  ("https://www.googleapis.com/drive/v3/files/" + fileFolderId + "/permissions"),
			headers: { "Authorization": ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_G_DRI_AUT_TOK")),
					   "Content-Type":   "application/json"
			},
			responseType: "json",
			data: {role: "reader", type: "user", emailAddress: email},
			success: function(permission) {
				     if (typeof(callback) == "function") { callback(permission); }
			},
			error: function(error, code) {
				if ( (code == 401) || ((code == 0) && ( JSON.stringify(error) == '""' )) ) { refreshToken(makePublic, [fileFolderId]); return; }
				alert("No se puede dar acceso al archivo: " + code + "\n mensaje: \n" + JSON.stringify(error));
			}
	});
}