///  ----- Includes  ----- 
var UI =  require("./UI.js");
var SceneUtils = require("./SceneUtils.js");
var FlyControls =  require("./FlyControls.js");


/**
 * Tyria 3D Web application
 * 
 * The tyria3d.com web UI
 *
 * @main Tyria3DApp
 * @class Tyria3DApp
 * @static 
 */
var Tyria3DApp = module.exports = function() {

	this.map;
	this.stats;
	this.controller;
	this.hasPointerLock;
	this.ui;

	this.lastTs = -1;
	this.animating = false;
	this.localReader = null;
	this._mapRect = null;

	this.animationTime = 350 * 0;

	/// Run UI stuff when document is rdy
	$(document).ready(this.onDocumentReady.bind(this));

	/**
	 * @method initAnim
	 */
	this.initAnim = function(){
		var self =  this;
		$(".content  h1").first().animate({"margin-top":20}, self.animationTime);
		$("nav").slideUp(self.animationTime,function(){
			$("#intro").delay(self.animationTime).fadeOut(self.animationTime,self.init.bind(self));
		});
	}

	/**
	 * @method init
	 */
	this.init = function(){
		var self = this;

		// Hide intro div
		$("#intro").hide();	

		/// Add stats (toggled by pressing "i")
		this.stats = new Stats();
		$("body").append( this.stats.domElement );

		/// Create fly controls, initare after UI DOM has been added.
		this.controller = new FlyControls();

		/// Set up UI
		this.ui = new UI( $("body"), this.controller, this.loadMap.bind(self) );
		this.ui.init();

		/// Create file picker, used to pick DAT file
		var filePicker = $("<input type='file' class='hidden' />");
		var fileIcon = $("<button id='fileInputIcon' tabindex='-1'>Select a Guild Wars 2 .dat file</button>");
		fileIcon.click(function () {
		    filePicker.trigger('click');
		});
		
		/// .dat file received from the file input, entry point!
		var onReceiveFile = function(evt){
			
			/// Get loaded file reference from event
			///TODO: Check file length etc.
			var files = evt.target.files;
			var file = files[0];

			filePicker.val('');
			
			/// Get a local reader
			self.localReader = T3D.getLocalReader(file, function(){
				
				/// Get the maps in the dat and put them in the UI.
				/// Show progress panel during load.
				SceneUtils.showProgressPanel(function(){		
			
					$("#output").find(".title").html("Finding maps (first visit only)");
					$("#output").find(".progress").html("initializing");

					setTimeout(function(){
							T3D.getMapListAsync(self.localReader, self.applyMapList, false);
					},10);
				});
			}, undefined, undefined, "js/T3D/t3dworker.js");

			// SAVE MAP CODE WAS HERE

		};

		/// Add listener to file input
		filePicker.change(onReceiveFile);

		/// Append file input elements to the DOM
		$("#filePanel").append(filePicker);
		$("#filePanel").append(fileIcon);

		/// Build deep map search interface
		var deepSearchButton = $("<span class='link'>Scan all .dat entries for maps</span>");
		deepSearchButton.click( function(evt){
			if ( confirm(
					"Searching the full .dat file will take roughly 10 minutes depending on file size.\n\n"+
					"Once complete the results will be stored locally and available every time you load this .dat.\n\n"+
					"Note that the vast majority of maps are probably already loaded."+
					"Are you sure you want to search the .dat for maps?"
				) ) {

				SceneUtils.showProgressPanel(function(){		
			
					$("#output").find(".title").html("Finding maps (first visit only)");
					$("#output").find(".progress").html("initializing");

					setTimeout(function(){
							T3D.getMapListAsync(self.localReader, self.applyMapList, true);
					},10);
				});
				
			}
			
		} );

		/// Append deep search elements to the DOM
		var searchParagraph = $("<p class='instruction'>Missing maps? </p>");
		searchParagraph.append(deepSearchButton);
		$("#mapPanel").append(searchParagraph);

		/// Key listeners connected to UI (toggle UI panel and stats)
		document.addEventListener( 'keydown', this.keyDownListener, false );
		document.addEventListener('mousewheel',this.mouseWheelListener, false); 

		/// Set up scene holding visible objects, lights, camera and renderer.
		SceneUtils.setupScene();

		/// Keep rendered hidden until map is ready to render.
		SceneUtils.setRenderVisible(false);
		
		/// Initiate controlls, connection them to the scene.
		this.hasPointerLock = this.controller.init();

	};



	/**
	 * Called when a map is specified via the drop down
	 * @method loadMap
	 * @param  {[type]} fileName [description]
	 * @param  {[type]} absolute [description]
	 * @return {[type]}          [description]
	 */
	this.loadMap = function(fileName, absolute){

		var self = this;

		/// Pop up the progres panel
		SceneUtils.showProgressPanel(function(){

			/// Disable controller and hide rendered during load
			self.controller.setMapReady(false);
			SceneUtils.setRenderVisible(false);

			/// Set up renderers
			var renderers = [
				{
					renderClass: T3D.HavokRenderer,
					settings:{
						visible: $("#showHavok")[0].checked
					}
				},
				{
					renderClass: T3D.EnvironmentRenderer,
					settings:{}
				},
				{
					renderClass: T3D.TerrainRenderer,
					settings:{
						anisotropy : SceneUtils.getRenderer().getMaxAnisotropy()
					}
				}				
			];

		    if( $('#loadZone').prop("checked") ){
		    	renderers.push({
		    		renderClass: T3D.ZoneRenderer,
		    		settings:{}
		    	});
		    }
		    if( $('#loadProp').prop("checked") ){
		    	renderers.push({
		    		renderClass: T3D.PropertiesRenderer,
		    		settings:{}
		    	});
		    }

			/// Call map renderer in order to get all 3d objects
			T3D.renderMapContentsAsync(self.localReader, fileName, renderers, self.onMapLoaded.bind(self));

		});	
	}

	/**
	 * Callback to transfer the parsed data to three-js
	 * @return {void}
	 */
	this.onMapLoaded = function(mapData){
		/// Clear scene
		SceneUtils.clear();

		//ZoneRenderer
		if(mapData.ZoneRenderer != undefined){
			mapData.ZoneRenderer.meshes.forEach(function(elem){
				SceneUtils.getScene().add(elem); //Visible
				SceneUtils.getNonCollisions().push(elem);
			});	
		}

		//PropertiesRenderer
		if(mapData.PropertiesRenderer != undefined){
			mapData.PropertiesRenderer.meshes.forEach(function(elem){
				SceneUtils.getScene().add(elem); //Visible
				SceneUtils.getNonCollisions().push(elem);
			});	
		}

		mapData.EnvironmentRenderer.skyElements.forEach(function(elem){
			SceneUtils.getSkyScene().add(elem);
			SceneUtils.getSkyObjects().push(elem);
		});		
		
		/// Add terrain tiles to a special list
		/// ( these need their fog updated in a specific way ).
		mapData.TerrainRenderer.terrainTiles.forEach(function(elem){
			SceneUtils.getScene().add(elem); //Visible
			SceneUtils.getTerrainChunks().push(elem); //Terrain
			SceneUtils.getCollisions().push(elem); //Collision
		});	

		SceneUtils.getScene().add(mapData.TerrainRenderer.water);
		SceneUtils.getNonCollisions().push(mapData.TerrainRenderer.water); //Water

		/// Add all collisions to a special list
		if(mapData.HavokRenderer != undefined){
			mapData.HavokRenderer.meshes.forEach(function(elem){
				SceneUtils.getScene().add(elem);
				SceneUtils.getCollisions().push(elem);
			});
		}

		/// Add lights
		mapData.EnvironmentRenderer.lights.forEach(function(elem){
			SceneUtils.getScene().add(elem);
			SceneUtils.getLights().push(elem);
		});

		/// Set haze color 
		var hazeColor = mapData.EnvironmentRenderer.hazeColor;
		var color = new THREE.Color(hazeColor[2]/255.0, hazeColor[1]/255.0, hazeColor[0]/255.0);
		SceneUtils.getRenderer().setClearColor( color, 1.0 );
		SceneUtils.getScene().fog.color.copy(color);

		/// Store bounds locally in order to display orto cam correctly
		_mapRect = mapData.TerrainRenderer.bounds;

		/// Enable UI
		this.controller.setMapReady(true);
		$("#UI").removeClass("hidden");

		/// Set ambient light slider to 50% if there were no parsed lights in the map data.
		$("#ambientSlider").slider("value",mapData.EnvironmentRenderer.hasLight ? 0 : 0.5);

		/// Set view dist after all objects are in place
		$("#fogSlider").slider("value",35000);

		/// Data Renderer is done start animating!
		if(this.hasPointerLock){
			SceneUtils.showPanel($("#suspendedPanel"));
		}
		else{
			SceneUtils.showPanel($("#errorPanel"));
		}
		
		/// Set camera position
		var controls = this.controller.getControls();
		controls.getObject().position.set(0, mapData.TerrainRenderer.bounds ? mapData.TerrainRenderer.bounds.y2 : 0, 0);
		controls.getPitchObject().rotation.x = -Math.PI/2;		

		// Initial render, indep. of controller being active
		SceneUtils.render();

		// Show canvas
		SceneUtils.setRenderVisible(true);

		/// Animate scene
		if(!this.animating){
			this.animating = true;
			this.animate(0);	
		}


	}//End onload callback


	/**
	 * @method  applyMapList
	 * @param  {[type]} mapList [description]
	 * @return {[type]}         [description]
	 */
	this.applyMapList = function(mapList){

		/// Update picker elements
		var picker = $("#mapPicker");
		picker.empty();
		picker.append($("<option selected='true' disabled='disabled'>Pick Map</option>")); 
		

		var compareName = function(a, b) {
			if (a.name < b.name)
			    return -1;
			if (a.name > b.name)
			    return 1;
			return 0;
		};

		mapList.maps.sort(compareName);
		
		mapList.maps.forEach(function(g){
			var group = $("<optgroup label='"+g.name+"' />");
			picker.append(group);

			g.maps.sort(compareName);
			g.maps.forEach(function(m){
				group.append("<option value='"+m.fileName+"'>"+m.name+"</option>");
			});
			
		});

		SceneUtils.showMapPanel();		
	}

	this.mouseWheelListener = function(evt){
		var dir = Math.sign(evt.wheelDelta);
		var s = $("#moveSpeedSlider");
		var min =  s.slider("option","min")
		var max = s.slider("option","max") 
		var range =max - min;
		
		var val = range*dir*0.05 + s.slider( "option", "value" );
		val = Math.min(max,val);
		val = Math.max(min,val);

		s.slider("option", "value", val);
	}

	/**
	 * Main "game" loop, called trough requestAnimationFrame
	 * @param  {[type]} timestamp [description]
	 * @return {[type]}           [description]
	 */
	this.animate = function(timestamp) {
		
		/// Get time step
		var delta = timestamp - this.lastTs;
		if(delta > 0){
			
			this.lastTs = timestamp;

			/// Update current controller
			if( this.controller.update(delta*0.001) ){

				/// If controller returns true, render
				SceneUtils.render();
			}

			/// Update stats (FPS etc)
			this.stats.update();

		}

		window.requestAnimationFrame( this.animate.bind(this) );
	}

	/**
	 * Settings and debugging key listener
	 * @method keyDownListener
	 * @param  {[type]} evt [description]
	 * @return {[type]}     [description]
	 */
	this.keyDownListener = function(evt){
		if(evt.keyCode == 85){ // U
			$("#UI").toggle();
			SceneUtils.resize();
		}
		if(evt.keyCode == 73){ // I
			$("#stats").toggle();
		}
		if(evt.keyCode == 80){ // P
			SceneUtils.setPerspective();
		}
		if(evt.keyCode == 79){ // O

			var r = _mapRect;
			if(r){
				var xMin = r.x1;
				var xMax = r.x2;
				var yMin = r.y1;
				var yMax = r.y2;
				SceneUtils.setOrthographic(xMin, xMax, yMin, yMax, 100000, -100000);
			}
		}
		if(evt.keyCode == 70){ // F
			$("#flyInput").trigger('click');
		}
	}

}


Tyria3DApp.prototype.onDocumentReady = function(){

	console.log("Tyria 3D API version "+T3D.version);
	var self = this;

	/// Detect Chrome and WebGL
	//var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
	var hasWebGL = T3D.hasWebGL();

	/// Hide blinking loader
	$("#frontpageLoader").addClass("hidden");

	/// Display error message for missing WebGL
	if (!window.WebGLRenderingContext || !hasWebGL) {
    	$("#errorGL").removeClass("hidden");
  	}

  	/// Display error message for non-Chrome browsers
  	// else if(!is_chrome){
  	// 	$("#errorChrome").removeClass("hidden");
  	// }

  	/// If everyting is ok, enable the button that shows the file picker.
  	else{
		$("#ILoveYouDiddi").removeClass("hidden").one("click",self.initAnim.bind(self));
  	}
}

/// Starting point
var App = new Tyria3DApp();