#include "(CurrentProject)/Documentos/GoogleDrive.js"

var json = theRoot.varToString("JSO"),
	email = theRoot.varToString("EML");

if (email !== "") {
	grantAccessTo(JSON.parse(json).id, email, function(permisions) {
		theRoot.setVar("LNK", getSharedLink(json));
	});
} else {
	makePublic(JSON.parse(json).id, function(permisions) {
		theRoot.setVar("LNK", getSharedLink(json));
	});
}
