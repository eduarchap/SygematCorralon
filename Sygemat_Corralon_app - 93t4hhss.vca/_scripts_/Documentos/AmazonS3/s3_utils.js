/**
 * Extracts the bucket from a url path
 * @constructor
 * @params {string} - path of the file to extract the bucket
 */
function getBucketFromPath(path) {
	return path.split("/")[1];
}

/**
 * Gets the prefix to be use from a ulr /bucket_name/folder1/folder2/folder3/example.txt
 * prefix => /folder1/folder2/folder3
 * @constructor
 * @params {string} - path of the file to extract the prefix
 */
function getPrefixFromPath(path) {
	var parts = path.split("/");
	parts.shift();
	parts.shift();
	return parts.join("/");
}

/**
 * Tells you if the file belongs to a folder
 * @constructor
 * @param {string} currentPath - The path that I'm actually exploring
 * @param {string} filePath    - The path of the file that is going to be checked.
*/
function belongsToCurrentFolder(currentPath, filePath) {
	var regex = new RegExp("^" + currentPath + "/");

	return filePath.replace(regex, "").split("/").length == 1;
}

/**
 * Gets the name of a file from a path
 * @constructor
 * @param {string} filePath - the URI for an specific file
 */
function getFilenameFromPath(filePath) {
	return filePath.split("/")[filePath.split("/").length - 1];
}

/**
 * Given a list of files that don't belong to the currentFolder 
 * it will extract what should be the level 1 folders to show.
 * @constructor
 * @param {array} subFiles - An array with string representing paths of subfolders, exam: /bucket1/folder1/folder2/file.txt
 * @param {string} currentPath - A string representing the currentPath, exam: /bucket1/folder1
 */
function getFoldersFromSubfiles(subFiles, currentPath) {
	var regex   = new RegExp("^" + currentPath + "/"),
		folders = _.map(subFiles, function(subFile) {
					return subFile.replace(regex, "").split("/")[0];
		}),
		uniqFoldes = _.select(folders, function(folder, index) {
					return folders.indexOf(folder) == index && folder !== "";
        });

	return uniqFoldes;
}