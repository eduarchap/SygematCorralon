#include "(CurrentProject)/Documentos/ajax.js"

importClass( "VFile" );
importClass( "VProcess" );

/**
 * Cleans a stringifyed JSON object
 * @param {object} args a JSON object to be escaped so it can be sent into http headers
 */
function httpHeaderSafeJson(args) {
	var charsToEncode = /[\u007f-\uffff]/g;

	return JSON.stringify(args).replace(charsToEncode, function (c) {
		return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4);
	});
}

/**
 * Gets the list of files from a particular folder or the root.
 * @param {string} path the url like path of the folder you want to explore, example: /folder1/subfolder
 * @param {function} callback function to be called after the funciona gets the list of files from Dropbox
 */
function getRootFiles(path, callback) {
	path  = path == "/" ? "" : path;
	var datos = { path: path, recursive: false, include_media_info: true, include_deleted: false };
	$.ajax({
			type: 	 "POST",
			url:  	 "https://api.dropboxapi.com/2/files/list_folder",
			headers: { "Content-Type":  "application/json", 
					   "Authorization": ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_DRO_ACC_TOK"))
			},
			data: 	 datos,
			responseType: "json",
			success: function(data) {
					 if ( typeof(callback) == "function" ) {
						callback(data.entries);
					 } else {
						addData(data.entries);
					 }
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
		var file       = entries[i],
			addProcess = new VProcess(theRoot);

		addProcess.setProcess("sygemat_corralon_app/ADD_COL");
		addProcess.setVar("NOM", file.name);
		addProcess.setVar("TO", to);
		addProcess.setVar("TIP", (file[".tag"] == "folder" ? "1" : "2"));
		addProcess.setVar("RUT_DES", file.path_lower);
    	addProcess.setVar("PLA", "dropbox");

		if ( file[".tag"] == "file" ) {
			addProcess.setVar("TAM", file.size);
		}
		addProcess.exec();
	}
}

/**
 * Inserts files into the FILES table so the explorer window can show them
 * @param {Array} entries List of files that came from Dropbox
 */
function addData(entries) {
	var z = entries.length;
	if ( theRoot.beginTrans("Añadir ficheros") ) {
		for (i=0; i < z; i++ ) {

			 var file  = entries[i],
				 nFile = new VRegister(theRoot);

			 nFile.setTable("sygemat_corralon_dat/DOC_EXP_W");
			 nFile.setField("NAME", file.name);
		     nFile.setField("TIP", (file[".tag"] == "folder" ? "1" : "2"));
			 nFile.setField("RUT", file.path_lower);

			 if ( file[".tag"] == "file" ) {
				nFile.setField("TAM", file.size);
				nFile.setField("FCH", file.client_modified); 
			 }

			 nFile.setField("JSON", JSON.stringify(file));
			 nFile.addRegister();
			 nFile = null;
			 file  = null;
		}
	theRoot.commitTrans();
	} else { alert("No funciona"); }
}

/**
 * Downloads a selected file to a folder in the local disk
 * @param {string} path - The path of the file in dropbox, example: /folder1/text.txt
 * @param {string} to the path on disk where the file should be written to
 * @param {string} file_name the name of the file once is downloaded
 */
function DownloadToFile( path, to ) {

		if ( theApp.sysInfo().getOs() < 200 ) {
			to = to.match(/\\$/) ? to : ( to + "\\" );
		} else {
			to = to.match(/\/$/) ? to : ( to + "/" );
		}

		var fileName = path.split("/")[path.split("/").length - 1 ],
			fullPath = to + fileName;

		$.ajax({
			type: "POST",
			responseType: "arraybuffer",
			url : "https://content.dropboxapi.com/2/files/download",
			headers : {Authorization:  ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_DRO_ACC_TOK")),
					   "Dropbox-API-Arg": httpHeaderSafeJson({path: path})
			},
			timeout: (30 * 60),
			success: function(data, status, composeURL) {
						var respuestaBA  = new VByteArray();
								respuestaBA  = data;

						var	respuesta    = respuestaBA,
						    fi = new VFile( fullPath );
						if ( fi.open( VFile.OpenModeWriteOnly | VFile.OpenModeTruncate) ) {
							fi.write(data);
							fi.close();
						}
			},
			error: function(data) {
						theApp.setGlobalVar("sygemat_corralon_dat/WOR", 0);
			}
		});
}

/**
 * Uploads a file to a Dropbox Folder
 * @param {string} file disc path to the file that is going to be uploaded,
 * @param {string} path the url like path where the file is going to be uploaded inside dropbox.
 * @param {function} callback a function to call after the file got uploaded.
 */
function fileUpload( file, path, callback ) {
	var fileToUp = readFile( file );

	if ( fileToUp.name !== "empty" ) {
		$.ajax({
			type: 	 "POST",
			url: 	 "https://content.dropboxapi.com/2/files/upload",
			headers: {Authorization:  ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_DRO_ACC_TOK")),
					  "Dropbox-API-Arg": httpHeaderSafeJson({path: path, mode: "overwrite", autorename: false, mute: true})},
			body:    fileToUp.array,
			timeout: (30 * 60),
			responseType: "json",
			success: function(data, codigo) {
					 if ( typeof(callback) == "function" ) { callback(data); }
			},
			error: function(data, code) {
					 theApp.setGlobalVar("sygemat_corralon_dat/WOR_UPL", 0);		 
			}
		});
	}
}

/**
 * Deletes a file from Dropbpx
 * @param {string} path to the file that is going to be deleted
 */
function deleteFile(path) {
	if ( path !== undefined ) {
		$.ajax({
				type: 	 "POST",
				url: 	 "https://api.dropboxapi.com/2/files/delete",
				headers: {Authorization:  ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_DRO_ACC_TOK")),
						  "Content-Type": "application/json"
				},
				data: {path: path},
				timeout: (30 * 60),
				responseType: "json",
				success: function(data, codigo) {
				}
		});
	}
}


/**
 * Creates a folder inside Dropbox
 * @param {string} path path of the new folder to be created, exam: /folder1/new_folder
 */
function createFolder(path) {
	if ( path !== undefined ) {
		$.ajax({
				type: 	 "POST",
				url: 	 "https://api.dropboxapi.com/2/files/create_folder",
				headers: {Authorization:  ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_DRO_ACC_TOK")),
						  "Content-Type": "application/json"
				},
				data: {path: path},
				timeout: (30 * 60),
				responseType: "json",
				success: function(data, codigo) {
				}	
		});
	}
}

/**
 * Moves a file from one folder to another
 * @param {string} from_path the path of the current location of the file to be moved.
 * @param {string} to_path the new location for the file to be moved/copied
 * @param {string} copy_mode a flag to indicate if the file is going to be copied (true) or moved (false)
 */
function move(from_path, to_path, copy_mode) {
	if ( from_path !== undefined && to_path !== undefined ) {
		var url = copy_mode ? "https://api.dropboxapi.com/2/files/copy" : "https://api.dropboxapi.com/2/files/move";
		$.ajax({
				type: 	 "POST",
				url: 	 url,
				headers: {Authorization:  ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_DRO_ACC_TOK")),
						  "Content-Type": "application/json"
				},
				data: {from_path: from_path, to_path: to_path},
				responseType: "json",
				success: function(data, codigo) {
						  if (codigo == 200) {
							alert("Terminado");
						  }
				}	
		});
	}
}

/**
 * Searches files that match a word(s) in a particular folder
 * @param {string} path The path to the folder that we want to search in.
 * @param {string} term the word(s) to be searched
 * @param {function} callback a funciton to be called after we get the results from the search
 */
function search(path, term, callback) {
		path = path == "/" ? "" : path;
		if (term !== undefined) {
			$.ajax({
				type: 	 "POST",
				url: 	 "https://api.dropboxapi.com/2/files/search",
				headers: {Authorization:  ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_DRO_ACC_TOK")),
						  "Content-Type": "application/json"
				},
				data: {path: path, query: term, start: 0, max_results: 100, mode: "filename"},
				responseType: "json",
				success: function(data, codigo) {
						  var matches = data.matches,
							  z = matches.length,
							  entries = [];
						 for ( i=0; i < z; i++ ) {
								var item = matches[i];
								entries.push(item.metadata);
						 }
						 callback(entries);
				}
			});
		}
}

/**
 * Creates a link to share the access to a particular file
 * @param {string} path  The path to the file that will be shared with the link
 */
function getSharedLink(path) {
		if ( path != "") {
			$.ajax({
				type: 	 "POST",
				url: 	 "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
				headers: {Authorization:  ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_DRO_ACC_TOK")),
						  "Content-Type": "application/json"
				},
				data: {path: path, "settings": { "requested_visibility": "public" }},
				responseType: "json",
				success: function(data, codigo) {
						 theRoot.setVar("LNK", data.url);
				},
			    error: function(data, codigo) {
						// if the share link was already created we need
						// to retrieve the stored shared link.
						getStoredSharedLink(path);
				}
			});
		}
}

/**
 * Gets the previously created shared link
 * @param {string} path The path to the file that will be shared with the link
 */
function getStoredSharedLink(path) {
		if ( path != "") {
			$.ajax({
				type: 	 "POST",
				url: 	 "https://api.dropboxapi.com/2/sharing/list_shared_links",
				headers: {Authorization:  ("Bearer " + theApp.globalVarToString("sygemat_corralon_dat/DOC_DRO_ACC_TOK")),
						  "Content-Type": "application/json"
				},
				data: {path: path},
				responseType: "json",
				success: function(data, codigo) {
						 alert(JSON.stringfy(data));
						 if (data.links && data.links.length > 0) {
							 var url = data.links[0].url;
							 theRoot.setVar("LNK", url);
						 } else {
							 theRoot.setVar("LNK", "");
						 }
				}
			});
		}
}