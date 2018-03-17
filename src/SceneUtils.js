var cameraOpts = {
	fov : 60,	near : 10, foglength:5000
};

var scene, skyScene;
var camera, oCamera;
var currentCamera, skyCamera; 
var renderer = null;

var collisions = [];
var nonCollisions = [];
var terrainChunks = [];
var lights = [];

var skyObjects = [];

var fogDistance = 0;

var renderCounter = 0;

function traverseLODs( object ) {
	if ( object instanceof THREE.LOD ) {
		object.update( camera );
	}
}



module.exports = {
	setupScene : function() {

		/// Create scene instance
		scene = new THREE.Scene();
		skyScene = new THREE.Scene();

		/// Create a camera, aim and place it.
		var sceneWidth = window.innerWidth;// -  $("#UI").width();

		currentCamera = camera = new THREE.PerspectiveCamera(cameraOpts.fov,
			sceneWidth / window.innerHeight,
			cameraOpts.near, fogDistance );

		skyCamera = new THREE.PerspectiveCamera(cameraOpts.fov,
			sceneWidth / window.innerHeight,
			cameraOpts.near, 1000000);
			
				

		/// Add ambient lighting
		
		var globalAmbient = new THREE.AmbientLight(0);
		scene.add(globalAmbient);
		

		var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.7 );
		directionalLight.position.set( 0, 0, 1 );
		scene.add( directionalLight );
		

		var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.3 );
		directionalLight.position.set( -1, 1, -1 );
		scene.add( directionalLight );

		/*

		var d = 0.53;
		var h = 0.27;
		var dh = 0.2;
		var s = 0.4;//0.3
		var l = 0.6;//0.5

		var alpha = 0.45;

		for(var i=0; i<5; i++){
			var li = new THREE.DirectionalLight( 0, 1);
			scene.add(li);
			lights.push(li);
		}

		lights[0].position.set( 0, 1, 0  );
		lights[1].position.set( -0.5, 0*0.5, -d );
		lights[2].position.set( 0.5, 0, -d );
		lights[3].position.set( 0, -1, 0 );
		lights[4].position.set( 0, 0*-0.5, d );

		this.setHSLa(h,s,l,alpha);*/




		/// Add directional lights
		/*var d5 = new THREE.DirectionalLight( 0, alpha);
		d5.color.setHSL( h, s, l );
		d5.position.set( 0, 1, 0  );
		scene.add( d5 );

		var d1 = new THREE.DirectionalLight( 0, alpha);
		h=(h+dh)%1;
		d1.color.setHSL( h, s, l );
		d1.position.set( -0.5, 0*0.5, -d );
		scene.add( d1 );

		var d2 = new THREE.DirectionalLight( 0, alpha );
		h=(h+dh)%1;
		d2.color.setHSL( h, s, l );
		d2.position.set( 0.5, 0, -d );
		scene.add( d2 );


		var d4 = new THREE.DirectionalLight( 0, alpha );
		h=(h+dh)%1;
		d4.color.setHSL( h, s, l );
		d4.position.set( 0, -1, 0 );
		scene.add( d4 );
		
		var d3 = new THREE.DirectionalLight( 0, alpha );
		h=(h+dh)%1;
		d3.color.setHSL( h, s, l );
		d3.position.set( 0, 0*-0.5, d );
		scene.add( d3 );*/

		//Fog
		scene.fog = new THREE.Fog(0xffffff, Math.max(1,fogDistance - cameraOpts.foglength), fogDistance);

		// LOD updates scene by itself before render is called, don't do it twice!
		//scene.matrixAutoUpdate = false;
		//scene.autoUpdate = false;
		
		/*var light = new THREE.PointLight( 0xffffff, 0.7, 5000 );
		light.position.set( 50, 50, 50 );
		camera.add(light);*/
		
		/// Create canvas rendering output
		renderer = new THREE.WebGLRenderer({
			/*alpha:true*/
			sortObjects:false,
			stencil:false,
			premultipliedAlpha:false,
			antialiasing: true ,
			//preserveDrawingBuffer:true
		});
		renderer.sortObjects = false;
		renderer.setSize(sceneWidth, window.innerHeight);
		//renderer.setClearColor( 0xffffff, 1.0 );
		//renderer.setClearColor( 0xccbbdd );
		renderer.autoClear = false;

		renderer.domElement.style.position = "absolute";

		/// Add renderer to html DOM
		document.body.appendChild(renderer.domElement);

		/// Listen to window size chaning
		$( window ).resize(this.resize);

		this.render();


	},

	setPerspective: function(){
		currentCamera = camera;
		this.render();
	},

	setOrthographic: function(l,r,t,b,n,f){

		var sceneWidth = window.innerWidth;// -  ( $("#UI").is(":visible") && $("#UI").width() );

		var aspect = sceneWidth / window.innerHeight;

		var dx = Math.abs(l-r);
		var dy = Math.abs(t-b);

		if( dx/dy < aspect ){
			var targetDx = dy * aspect;
			var fac = targetDx/(1.0*dx);
			l *= fac;
			r *= fac;	
		}
		else{
			var targetDy = dx / aspect;
			var fac = targetDy/(1.0*dy);
			t *= fac;
			b *= fac;	
		}
		
		///Margin
		var m = 1.01;
		l*=m; r*=m; t*=m; b*=m;

		oCamera = new THREE.OrthographicCamera(l,r,t,b,n,f);
		oCamera.position.set( 0*(l+r)/2.0, -f/2.0, 0*(t+b)/2.0 );
		oCamera.rotation.set(Math.PI/2.0,0,0,"YXZ");		

		//this.applyCameraRotationTo(oCamera);

		currentCamera = oCamera;

		this.render();

	},

	setHSLa: function(h,s,l,a){
		var dh = 0.2;
		for(var i=0; i<5; i++){
			if(lights[i]){
				lights[i].color.setHSL(h,s,l);
				lights[i].intensity = a;
				h=(h+dh)%1;	
			}
		}
	},

	setRenderVisible: function(value){
		if(value)
			renderer.domElement.style.display = "block";
		else
			renderer.domElement.style.display = "none";
	},

	applyCameraRotationTo: function(o){
		if(camera.parent){
			var rx = camera.parent.rotation.x;
			var ry = camera.parent.parent.rotation.y;
			o.rotation.set(rx,ry,0,"YXZ");		
		}
	},

	render: function(){
		if(renderer !== null){

			/// Always update matrix
			//scene.updateMatrixWorld();

			/// Only calculate distances every n:th render
			if(++renderCounter == 10){
				renderCounter = 0;
				scene.traverse( traverseLODs );
			}


			renderer.clear(renderer.getClearColor());

			/// Render skybox
			if(camera == currentCamera){
				this.applyCameraRotationTo(skyCamera);
				renderer.render(skyScene, skyCamera);
			}
			else{
				//this.applyCameraRotationTo(oCamera);	
			}

		    /// Render everything else
			renderer.render(scene, currentCamera);
		}
	},

	clear: function(){

		collisions.forEach(function(elem){
			scene.remove(elem);
		});

		nonCollisions.forEach(function(elem){
			scene.remove(elem);
		});

		lights.forEach(function(elem){
			scene.remove(elem);
		});

		skyObjects.forEach(function(elem){
			skyScene.remove(elem);
		});
		
		nonCollisions = [];
		collisions = [];
		lights = [];
		skyObjects = [];
		terrainChunks = [];
	},

	resize: function(){
		var sceneWidth = window.innerWidth;//-  ( $("#UI").is(":visible") && $("#UI").width() );

		camera.aspect = sceneWidth / window.innerHeight;
		skyCamera.aspect = sceneWidth / window.innerHeight;

		renderer.setSize(sceneWidth, window.innerHeight);

		camera.updateProjectionMatrix();
		skyCamera.updateProjectionMatrix();


		module.exports.render();
	},

	setAmbientAdd: function(value){
		lights.forEach(
			function(elem){
				var v = value;
				if(elem.added){
					v -= elem.added;
				}
				if(elem instanceof THREE.AmbientLight){
					elem.color.addScalar(v);
				}
				elem.added = value;
			}
		);
		module.exports.render();
	},

	setFog: function(distance){
		fogDistance = distance;
		if(scene && scene.fog){
			scene.fog.far = distance;
			scene.fog.near = Math.max(1,distance - cameraOpts.foglength);
		}
		if(camera){
			camera.far = distance;
			camera.updateProjectionMatrix();

			/// Update terrain material
			terrainChunks.forEach(function(mesh){
				mesh.material.uniforms["fogNear"].value = scene.fog.near;
				mesh.material.uniforms["fogFar"].value = scene.fog.far;
				mesh.material.needsUpdate = true;
			})
		}
		this.render();
		
	},

	showProgressPanel: function(cb){
		var pp = $("#progressPanel");

		if(pp.is(":visible")){
			if(cb)
				cb();
			return;
		}

		pp.find(".title").html("Loading");
		pp.find(".progress").html("...");

		this.showPanel(pp, cb);
	},

	showMapPanel: function(cb){
		this.showPanel($("#mapPanel"), cb);
	},

	showPanel: function(panelIn, cb){
		var currentPanel = $("#output").find(".ui-panel:visible");

		this.swapPanels(currentPanel, panelIn, true, cb);
		/*panelIn.css({left:"auto",right:"auto"});
		panelIn.siblings().addClass("hidden");
		panelIn.removeClass("hidden");*/
	},

	swapPanels: function(panelOut, panelIn, dir, cb){
		var t = 400 * 0;
		var ease = "swing";

		/// Fix height
		panelOut.parent().css({height:panelOut.parent().height()});
		panelIn.removeClass("hidden");
		var h = panelIn.height();
		panelIn.addClass("hidden");


		/// Set slide in start values
		panelIn.css({right:dir?-500:'auto', left:dir?'auto':-500});

		
		/// Current element slide out
		panelOut.css({right:dir?-500:'auto'});

		var animateOutProp, animateInProp;
		if(dir){
			animateOutProp = {left:-500};
			animateInProp = {right:0};
		}
		else{
			animateOutProp = {right:-500};
			animateInProp = {left:0};

		}

		panelOut.animate(animateOutProp, t, ease, function(){

			/// Hide Current element
			panelOut.addClass("hidden");

			/// Parent height
			panelOut.parent().animate({height:h}, t/2.0, ease, function(){			

				/// Slide in next element
				panelIn.removeClass("hidden");
				panelIn.animate(animateInProp, t, ease, cb);

			});

		});
	},

	getScene: function(){ return scene; },
	getSkyScene: function(){ return skyScene; },
	getCamera: function(){ return camera; },
	getRenderer: function(){ return renderer; },
	getCollisions: function(){ return collisions; },
	getNonCollisions: function(){ return nonCollisions; },
	getTerrainChunks: function(){ return terrainChunks; },
	getSkyObjects: function(){ return skyObjects; },
	getLights: function(){ return lights; }
}; 
