function cloneList(listView) {
	registerListOut=new VRegisterList(listView.root());
	listView.getList(registerListOut);
	return registerListOut;
}
