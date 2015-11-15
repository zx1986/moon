import {
    scene, camera, renderer
}
from './common/scene';
import {
    setEvents
}
from './common/setEvents';
import {
    convertToXYZ, getEventCenter, geodecoder
}
from './common/geoHelpers';
import {
    mapTexture
}
from './common/mapTexture';
import {
    getTween, memoize
}
from './common/utils';
import topojson from 'topojson';
import THREE from 'THREE';
import d3 from 'd3';

d3.json('data/moon.json', function(err, data) {

    d3.select("#loading").transition().duration(500)
        .style("opacity", 0).remove();

    var currentCountry, overlay;

    var segments = 155; // number of vertices. Higher = better mouse accuracy

    // Setup cache for country textures
    var countries = topojson.feature(data, data.objects.countries);
    var geo = geodecoder(countries.features);

    var textureCache = memoize(function(cntryID, color) {
        var country = geo.find(cntryID);
        return mapTexture(country, color);
    });

    // Base globe with blue "water"
    let blueMaterial = new THREE.MeshPhongMaterial();
    blueMaterial.map = THREE.ImageUtils.loadTexture('img/moon.jpg');
    let sphere = new THREE.SphereGeometry(200, segments, segments);
    let baseGlobe = new THREE.Mesh(sphere, blueMaterial);

    baseGlobe.rotation.y = Math.PI;
    baseGlobe.addEventListener('click', onGlobeClick);
    baseGlobe.addEventListener('mousemove', onGlobeMousemove);

    // add base map layer with all countries
    let worldTexture = mapTexture(countries, '#647089');
    let mapMaterial = new THREE.MeshPhongMaterial({
        map: worldTexture,
        transparent: true
    });
    var baseMap = new THREE.Mesh(new THREE.SphereGeometry(200, segments, segments), mapMaterial);
    baseMap.rotation.y = Math.PI;

    // create a container node and add the two meshes
    var root = new THREE.Object3D();
    var content = '<button id="buy" class="ui huge yellow button">Buy it!</button><button id="cancel" class="ui huge grey button">Cancel</button><br /><br /><label id="price" style="color:red;font-size:20px;padding:5;">$1 Ethereum</label>';
    root.scale.set(2.5, 2.5, 2.5);
    root.add(baseGlobe);
    root.add(baseMap);
    scene.add(root);

    function onGlobeClick(event) {
        // Get pointc, convert to latitude/longitude
        var latlng = getEventCenter.call(this, event);

        // Get new camera position
        var temp = new THREE.Mesh();
        temp.position.copy(convertToXYZ(latlng, 900));
        temp.lookAt(root.position);
        temp.rotateY(Math.PI);

        for (let key in temp.rotation) {
            if (temp.rotation[key] - camera.rotation[key] > Math.PI) {
                temp.rotation[key] -= Math.PI * 2;
            } else if (camera.rotation[key] - temp.rotation[key] > Math.PI) {
                temp.rotation[key] += Math.PI * 2;
            }
        }

        var tweenPos = getTween.call(camera, 'position', temp.position);
        d3.timer(tweenPos);

        var tweenRot = getTween.call(camera, 'rotation', temp.rotation);
        d3.timer(tweenRot);

        var country = geo.search(latlng[0], latlng[1]);
        if (country != null) {
            buy(country.code);
        } else {
            $("#buyit").html("");
            baseGlobe.addEventListener('mousemove', onGlobeMousemove);
        }
    }

    function onGlobeMousemove(event) {
        var map, material;

        // Get pointc, convert to latitude/longitude
        var latlng = getEventCenter.call(this, event);

        // Look for country at that latitude/longitude
        var country = geo.search(latlng[0], latlng[1]);

        if (country !== null && country.code !== currentCountry) {

            // Track the current country displayed
            currentCountry = country.code;

            // Update the html
            d3.select("#msg").html(country.code);

            // Overlay the selected country
            map = textureCache(country.code, '#CDC290');
            material = new THREE.MeshPhongMaterial({
                map: map,
                transparent: true
            });
            if (!overlay) {
                overlay = new THREE.Mesh(new THREE.SphereGeometry(201, 40, 40), material);
                overlay.rotation.y = Math.PI;
                root.add(overlay);
            } else {
                overlay.material = material;
            }
        }
    }

    setEvents(camera, [baseGlobe], 'click');
    setEvents(camera, [baseGlobe], 'mousemove', 10);

    // --- start of moon team ---

    function buy(id) {

        $("#buyit").html(content);
        $("#cancel").click(cancel);

        if (avaiable(id)) {
            $("#buy").click({
                id: id
            }, to_buy);
        } else {
            $("#buy").removeClass("grey").addClass("disabled");
        }

        baseGlobe.removeEventListener('mousemove', onGlobeMousemove);
        console.log('buy it!');
    }

    function to_buy(id) {
        // your AJAX code here.
        // ....
        $("#buy").html("Sold!!");
        openWindow("/img/deed.jpg","deed");
        document.getElementById('cancel').style.visibility = 'hidden';
        //document.getElementById('price').style.visibility = 'hidden';
        baseGlobe.addEventListener('click', onGlobeClick);
        baseGlobe.addEventListener('mousemove', onGlobeMousemove);
        console.log('got it!');
    }

    function avaiable(id) {
        // your AJAX to check if it avaiable
        // ....
        console.log('status: ', id);
        return true;
    }

    function cancel() {
        baseGlobe.addEventListener('click', onGlobeClick);
        baseGlobe.addEventListener('mousemove', onGlobeMousemove);
        $("#buyit").html("");
        $("#msg").html("");
        console.log('cancel it!');
    }
function openWindow(url,name){
      var w_width=410;                                                                                 //設定開啟視窗的寬度
      var w_height=567;                                                                                //設定開啟視窗的高度
      var x=(screen.width-w_width)/2;                                                           //計算螢幕與開啟視窗的寬度
      var y=(screen.height-w_height)/2;                                                        //計算螢幕與開啟視窗的高度
      var ww='width='+w_width+',height='+w_height+',top='+y+',left='+x;     //將新獲取的設定用字串方式先串起來
      var openWIN=window.open(url,name,ww);                                         //將設定值放入函數中
}


    // --- end of moon team ---

});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();