sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"portalnew/model/models",
	"sap/ui/model/json/JSONModel"
], function(UIComponent, Device, models, JSONModel) {
	"use strict";

	return UIComponent.extend("portalnew.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function() {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);
			var ojson = new JSONModel();
			this.setModel(ojson, "plantmodel");
			
			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			this.getRouter().initialize();
			
			var ojson2 = new JSONModel();
			this.setModel(ojson2, "shopmodel");
	var ojson3 = new JSONModel();
			this.setModel(ojson3, "insdetailmodel");
				var ojson4 = new JSONModel();
			this.setModel(ojson4, "insopertmodel");
		}
	});
});