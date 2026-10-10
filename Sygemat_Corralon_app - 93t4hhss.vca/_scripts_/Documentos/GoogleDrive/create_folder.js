#include "(CurrentProject)/Documentos/GoogleDrive.js"

var folderName = theRoot.varToString("CAR_NOM"),
    parentId   = theRoot.varToString("PAR_ID");

createFolder(folderName, parentId);