function buildProjectDictionary(includeInherited) {
	var project = theApp.mainProjectInfo();
	var tableType = VObjectInfo.TypeTable;
	var fieldType = VObjectInfo.TypeField;
	var indexTypes = [VObjectInfo.TypeIndex, VObjectInfo.TypeComplexIndex];
	var partTypes = [VObjectInfo.TypeIndexPart, VObjectInfo.TypeComplexIndexPart];
	var tableCount = includeInherited ? project.allObjectCount(tableType) : project.objectCount(tableType);
	var result = [];

	for (var tablePos = 0; tablePos < tableCount; tablePos++) {
		var tableObj = includeInherited
			? project.allObjectInfo(tableType, tablePos)
			: project.objectInfo(tableType, tablePos);

		var tableEntry = {};
		tableEntry[tableObj.idRef()] = tableObj.name();
		tableEntry.campos = [];
		tableEntry.indices = [];

		var fieldCount = tableObj.subObjectCount(fieldType);
		for (var fieldPos = 0; fieldPos < fieldCount; fieldPos++) {
			var fieldObj = tableObj.subObjectInfo(fieldType, fieldPos);
			var fieldEntry = {};
			fieldEntry[fieldObj.id()] = fieldObj.name();
			tableEntry.campos.push(fieldEntry);
		}

		for (var indexTypePos = 0; indexTypePos < indexTypes.length; indexTypePos++) {
			var currentIndexType = indexTypes[indexTypePos];
			var indexCount = tableObj.subObjectCount(currentIndexType);

			for (var indexPos = 0; indexPos < indexCount; indexPos++) {
				var indexObj = tableObj.subObjectInfo(currentIndexType, indexPos);
				var indexEntry = {};
				indexEntry[indexObj.id()] = indexObj.name();
				indexEntry.partes = [];

				for (var partTypePos = 0; partTypePos < partTypes.length; partTypePos++) {
					var currentPartType = partTypes[partTypePos];
					var partCount = indexObj.subObjectCount(currentPartType);

					for (var partPos = 0; partPos < partCount; partPos++) {
						var partObj = indexObj.subObjectInfo(currentPartType, partPos);
						indexEntry.partes.push(partObj.id());
					}					
				}
				tableEntry.indices.push(indexEntry);
			}
		}

		result.push(tableEntry);
	}

	return result;
}

var estructuraProyecto = buildProjectDictionary(true);

theRoot.setVar("RET", JSON.stringify(estructuraProyecto, null, 4));


