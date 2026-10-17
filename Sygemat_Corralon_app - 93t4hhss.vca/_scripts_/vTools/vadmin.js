
#include "(CurrentProject)/vTools/utils.js"
importApi("AdminApi");

vAdmin = {};
vAdmin.separador = ';;';

user = {};
vAdmin.user=user;


user.add = function (name, fullName, password, esSupervisor, cuentaBloqueada, cuentaDesactivada, debeCambiarPassword, passwordNoCaduca, grupos) {
	var user = new VUser();
	
	// Comprobamos si ya existe un usuario con el mismo name y diferente id
	if (theServerAdmin.getUserByName(name, user))
		return { "result": -1, "text": '"'+tr("sygemat_corralon_app/ERR_USR_DUP")+'"' };
	// Recuperamos el usuario para ahora hacer los cambios oportunos
	user.setName(name);
	user.setFullName(fullName);
	// Si la password viene definida la cambiamos
	if (password)
		user.changePassword(password);
	user.setAdministrator(esSupervisor);
	user.setAccountDisabled(cuentaDesactivada);
	user.setAccountBlocked(cuentaBloqueada);
	user.setChangePasswordNextConnect(debeCambiarPassword);
	user.setPasswordNotExpire(passwordNoCaduca);
	// Si nos vienen definidos los grupos (separados por "separador", le asignamos los que nos vienen por parámetro
	if (grupos) {
		grupos=grupos.split(vAdmin.separador);
		for (var i=0; i<grupos.length;i++) {
			user.addGroup(grupos[i]);
		}
	}
	if (theServerAdmin.addUser(user))
		return { "result": 1, "text": '"'+tr("sygemat_corralon_app/USR_SAV_OK")+'"' }
	else
		return { "result": -1, "text": '"'+tr("sygemat_corralon_app/ERR_SAV_USR")+'"' }
}

user.update = function (id, name, fullName, password, esSupervisor, cuentaBloqueada, cuentaDesactivada, debeCambiarPassword, passwordNoCaduca, grupos) {
	var user = new VUser();
	
	if (theServerAdmin.getUserById(id, user)) {
		// Recuperamos el usuario para ahora hacer los cambios oportunos
		user.setName(name);
		user.setFullName(fullName);
		// Si la password viene definida la cambiamos
		if (password)
			user.changePassword(password);
		user.setAdministrator(esSupervisor);
		user.setAccountDisabled(cuentaDesactivada);
		user.setAccountBlocked(cuentaBloqueada);
		user.setChangePasswordNextConnect(debeCambiarPassword);
		user.setPasswordNotExpire(passwordNoCaduca);

		// Quitamos todos los grupos a los que pertenece el usuario
		for (var i=0; i<user.groupCount(); i++)
		{
			user.removeGroup(user.groupCodeAt(i));
		}

		// Si nos vienen definidos los grupos (separados por "separador", quitamos al usuario todos los grupos y le asignamos los que nos vienen por parámetro
		if (grupos)
		{
			grupos=grupos.split(vAdmin.separador);
			for (i=0; i<grupos.length;i++)
			{
				user.addGroup(grupos[i]);
			}
		}
		
		if (theServerAdmin.modUser(user))
			return { "result": 1, "text": '"'+tr("sygemat_corralon_app/USR_SAV_OK")+'"' }
		else
			return { "result": -1, "text": '"'+tr("sygemat_corralon_app/ERR_SAV_USR")+'"' }
	} else
		return { "result": -1, "text": '"'+tr("sygemat_corralon_app/ERR_LOC_USR")+'"' }
}

user.getGroups = function (idname) {
	var user = new VUser();
	var userGroupList = new VUserGroupList();
	var encontrado = false;
	
	// Nos puede venir el id o el name del usuario. Averiguamos de que tipo es y obtenemos el User en cada caso
	if (typeof idname == 'string')
		encontrado = theServerAdmin.getUserByName(idname, user)
	else
		encontrado = theServerAdmin.getUserById(idname, user);
	
	if (encontrado) {
		var groupCode;
		var userGroup = new VUserGroup();
		
		for (var i=0; i< user.groupCount(); i++) {
			groupCode = user.groupCodeAt(i);
			if (theServerAdmin.getUserGroupById(groupCode, userGroup))
				userGroupList.append(userGroup);
		}
	}
	return userGroupList;
}