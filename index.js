'use strict';

/*TODO:
add moon texture
*/

const game = {
  init: function() {
    game.canvas = document.getElementById('ctime');
    game.ctx = game.canvas.getContext('2d');
    game.ccanvas = document.getElementById('cclock');
    game.cctx = game.ccanvas.getContext('2d');
    game.iwb = document.getElementById('img_wb');
    game.cfive = document.getElementById('cfive');
    game.ctx5 = game.cfive.getContext('2d');

    game.textures = {};
    game.unloadedTextures = 0;
    let textureMap = [
      'grass,./grass2.jpg',
      'sky,./sky4096.jpg',
      'lf0,./lensflare0.png',
      'lf2,./lensflare2.png',
      'lf3,./lensflare3.png',
      'shell,./shell.jpg',
      'body,./snailBody.jpg',
      'bodyAlpha,./snailBodyAlpha.jpg',
      'stars,./2k_stars_milky_way.jpg',
      'planet1,./planet1.jpg',
      'planet2,./planet2.jpg',
      'roof,./roof.jpg',
      'whiteBrick,./whiteBrick.jpg'
    ];

    game.textures.time = new THREE.Texture(game.canvas);
    game.textures.clock = new THREE.Texture(game.ccanvas);
    game.textures.c5 = new THREE.Texture(game.cfive);

    game.updateCanvasImage('23:45', 0.0);
    game.updateClockImage(new Date());

    textureMap.forEach(t => {
      let [name, url] = t.split`,`;
      game.loadTexture(name, url);
    });


    game.textures.grass.wrapS = THREE.RepeatWrapping;
    game.textures.grass.wrapT = THREE.RepeatWrapping;
    game.textures.grass.repeat.set(32,32);

    game.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.001, 10000 );

    game.scene = new THREE.Scene();

    let alight = new THREE.AmbientLight(0xFFFFFF, 0.5);
    game.scene.add(alight);
    game.alight = alight;

    game.plight = new THREE.PointLight(0xffffff, 2, 100);
    game.plight.position.set(2,2,2);
    game.scene.add(game.plight);

    game.genWorld();

    game.renderer = new THREE.WebGLRenderer( { antialias: true } );
    game.renderer.setSize( window.innerWidth, window.innerHeight );

    document.body.appendChild( game.renderer.domElement );

    document.addEventListener('keydown', game.keydown);
    document.addEventListener('keyup', game.keyup);
    document.addEventListener('pointerlockchange', game.pointerlockchange);
    document.addEventListener('pointerlockerror', game.pointerlockerror);
    document.addEventListener('mousedown', game.mousedown);
    document.addEventListener('touchstart', game.touchstart);
    game.touchCount = 0;

    game.player = {};
    game.player.x = 0;
    game.player.y = 0;
    game.player.z = 0;
    game.player.hangle = Math.PI * 0.5;
    game.player.vangle = 0.175;
    game.player.hspeed = 0.03;
    game.player.vspeed = 0;
    game.poffset = 0;

    game.downKeys = {};
    game.mousePos = {x: game.renderer.domElement.width * 0.5, y: 0};
    game.startEclipse = false;
    game.tick();
  },

  textAtPointAndAngle: function(context, x, y, angle, text) {
    context.save();
    context.translate(x, y);
    context.rotate(-angle);
    context.fillText(text, 0, 0);
    context.restore();
  },

  updateCanvasImage: function(time, alpha) {
    game.ctx.fillStyle = '#808080';
    game.ctx.fillRect(0, 0, 256, 256);
    game.ctx.font = '40pt Arial';
    game.ctx.fillStyle = `rgba(192,192,192,${alpha})`;
    game.ctx.textAlign = 'center';
    game.ctx.textBaseline = 'middle';
    game.textAtPointAndAngle(game.ctx, 230, 128, -Math.PI/2, time);
    game.textures.time.needsUpdate = true;
  },

  updateClockImage: function(time) {
    let ctx = game.cctx;
    ctx.drawImage(game.iwb, 0, 0, 256, 256);

    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(128, 128, 100, 0, Math.PI*2);
    ctx.stroke();
    ctx.fillStyle = '#808080';
    ctx.fill();

    let i = 0;
    for (let a = 0; a < Math.PI * 2; a += Math.PI * 2 / 12) {
      i++;
      let minR = 85;
      let maxR = 100;
      let x1 = minR * Math.cos(a) + 128;
      let y1 = minR * Math.sin(a) + 128;
      let x2 = maxR * Math.cos(a) + 128;
      let y2 = maxR * Math.sin(a) + 128;
      ctx.lineWidth = 8;
      if (i === 4) {
        ctx.strokeStyle = 'black';
      } else {
        ctx.strokeStyle = 'gold';
      }
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    let h = time.getHours();
    let m = time.getMinutes();
    let s = time.getSeconds();
    let ms = time.getMilliseconds();
    if (h > 11) {h-=12;}

    let hp = h / 12 + m / (12 * 60) + s / (12 * 60 * 60) + ms / (12 * 60 * 60 * 1000);
    let mp = m / (60) + s / (60 * 60) + ms / (60 * 60 * 1000);

    let angleOffset = Math.PI;

    let hourR = 50;
    let hourX = hourR * Math.cos(hp * Math.PI * 2 - Math.PI/2 + angleOffset) + 128;
    let hourY = hourR * Math.sin(hp * Math.PI * 2 - Math.PI/2 + angleOffset) + 128;

    let mr = 64;
    let mx = mr * Math.cos(mp * Math.PI * 2 - Math.PI/2 + angleOffset) + 128;
    let my = mr * Math.sin(mp * Math.PI * 2 - Math.PI/2 + angleOffset) + 128;

    ctx.strokeStyle = '#A0A0A0';
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(mx, my);
    ctx.stroke();

    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(hourX, hourY);
    ctx.stroke();

    game.textures.clock.needsUpdate = true;
  },

  getTimeString: function(t) {
    let [h,m] = t.toLocaleTimeString().split` `[0].split`:`;
    return `${h}:${m}`;
  },

  genWorld: function() {

    //add ground
    let geometry = new THREE.PlaneGeometry(300, 300);
    let material = new THREE.MeshBasicMaterial( {
      map: game.textures.grass});
    let plane = new THREE.Mesh(geometry, material);
    plane.position.set(10, 15, 0.01);
    game.scene.add(plane);
    game.ground = plane;

    //add sky
    let g = new THREE.SphereGeometry(1000, 25, 25);
    let m = new THREE.MeshPhongMaterial({map: game.textures.sky });
    game.skym = m;
    let sky = new THREE.Mesh(g, m);
    sky.material.side = THREE.BackSide;
    game.scene.add(sky);

    //add stars
    g = new THREE.SphereGeometry(800, 25, 25);
    m = new THREE.MeshBasicMaterial({map: game.textures.stars, transparent: true, opacity: 0});
    let stars = new THREE.Mesh(g, m);
    stars.material.side = THREE.BackSide;
    game.scene.add(stars);
    game.stars = stars;

    //add sun
    g = new THREE.SphereGeometry(6, 25, 25);
    m = new THREE.MeshPhongMaterial({
      color: 0xFFFFad,
    });
    let sun = new THREE.Mesh(g, m);
    let sundist = 200;
    game.sundist = sundist;
    sun.position.set(sundist, 0, 100);
    game.scene.add(sun);

    let sunLight = new THREE.PointLight(0xffffff, 1.5, 2000);
    let lensflare = new THREE.Lensflare();
    game.lensFlairs = [];
    game.lensFlairs.push(new THREE.LensflareElement(game.textures.lf0, 512, 0));
    game.lensFlairs.push(new THREE.LensflareElement(game.textures.lf2, 512, 0));
    game.lensFlairs.push(new THREE.LensflareElement(game.textures.lf3, 60, 0.6));
    game.lensFlairs.forEach(f => {
      lensflare.addElement(f);
    });

    sunLight.add(lensflare);
    game.scene.add(sunLight);
    sunLight.position.set(sundist-7, 0, 100);
    game.sunLight = sunLight;

    g = new THREE.SphereGeometry(5.4, 25, 25);
    m = new THREE.MeshPhongMaterial( {map: game.textures.time});
    let moon = new THREE.Mesh(g, m);
    moon.position.set(sundist-20, 3, 90);
    game.scene.add(moon);
    game.moon = moon;

    game.darkMaterials = [];

    g = new THREE.SphereGeometry(200, 25, 25);
    m = new THREE.MeshBasicMaterial( {map: game.textures.shell});
    let snailShell = new THREE.Mesh(g, m);
    snailShell.position.set(400, 3, -170);
    game.scene.add(snailShell);
    game.snailShell = snailShell;
    game.darkMaterials.push(snailShell.material);

    g = new THREE.BoxGeometry(10, 300, 50);
    m = new THREE.MeshBasicMaterial( {map: game.textures.body, transparent: true, alphaMap: game.textures.bodyAlpha});
    let tm = new THREE.MeshBasicMaterial({transparent: true, opacity: 0});
    let mlist = [tm,m,tm,tm,tm,tm];
    let snailBody = new THREE.Mesh(g, mlist);
    snailBody.position.set(400,160,10);
    snailBody.rotateX(0.1);
    game.scene.add(snailBody);
    game.snailBody = snailBody;
    game.darkMaterials.push(m);

    game.addPlanet(500, 0.5, 40, 10, game.textures.planet1, new THREE.Color('hsl(0, 70%, 80%)'));
    game.addPlanet(300, 0.2, 50, 5, game.textures.planet1, new THREE.Color('hsl(40, 70%, 90%)'));
    game.addPlanet(400, -0.8, 45, 15, game.textures.planet2, new THREE.Color('hsl(60, 70%, 90%)'));
    game.addPlanet(100, 1.3, 35, 3, game.textures.planet2, new THREE.Color('hsl(180, 60%, 80%)'));
    game.addPlanet(500, -2.6,  30, 5, game.textures.planet2);

    //add vertical bar on sun
    g = new THREE.BoxGeometry(0.5, 0.5, 80);
    m = new THREE.MeshBasicMaterial( {userData: {r: 0.898, g: 0.651, b: 0.278}} );
    let sunBar = new THREE.Mesh(g, m);
    sunBar.position.set(200, 0, 55);
    game.scene.add(sunBar);
    game.darkMaterials.push(m);

    //add horizontal bar to earth
    g = new THREE.BoxGeometry(200, 0.5, 0.5);
    m = new THREE.MeshBasicMaterial( {userData: {r: 0.898, g: 0.651, b: 0.278}});
    let earthBar = new THREE.Mesh(g, m);
    let earthAngle = Math.PI + 0.1;
    let x = 200 + 100 * Math.cos(earthAngle);
    let y = 0   + 100 * Math.sin(earthAngle);
    earthBar.position.set(x, y, 0);
    earthBar.rotateZ(earthAngle);
    earthBar.rotateY(0.2);
    game.scene.add(earthBar);
    game.darkMaterials.push(m);

    game.clockMaterials = [];
    //create clock tower
    let clockAngle = Math.PI/3;
    let clockX = 100;
    let clockY = -50;
    //add tower base
    g = new THREE.BoxGeometry(10,10,38);
    m = new THREE.MeshPhongMaterial({map:game.textures.whiteBrick});
    let base = new THREE.Mesh(g, m);
    base.position.set(clockX,clockY,0);
    base.rotateZ(clockAngle);
    game.scene.add(base);
    game.clockMaterials.push(m);

    //add tower clock section
    g = new THREE.BoxGeometry(12,12,12);
    m = new THREE.MeshBasicMaterial({map:game.textures.whiteBrick});
    let cm = new THREE.MeshPhongMaterial({map:game.textures.clock});
    let faceMaterialMap = [m,m,cm,m,m,m];
    let clock = new THREE.Mesh(g, faceMaterialMap);
    clock.position.set(clockX,clockY,25);
    clock.rotateZ(clockAngle);
    game.scene.add(clock);
    game.clockMaterials.push(m);
    game.clockMaterials.push(cm);

    //add tower roof
    game.textures.roof.repeat.set(4, 1);
    g = new THREE.ConeGeometry(10, 10, 4);
    m = new THREE.MeshPhongMaterial({map:game.textures.roof});
    let roof = new THREE.Mesh(g, m);
    roof.position.set(clockX,clockY,36.5);
    roof.rotateZ(clockAngle+Math.PI/4);
    roof.rotateX(Math.PI/2);
    game.scene.add(roof);
    game.clockMaterials.push(m);

    g = new THREE.BoxGeometry(0.1,50,50);
    m = new THREE.MeshPhongMaterial({map:game.textures.c5, transparent: true});

    let c5 = new THREE.Mesh(g, m);
    c5.position.set(200,0,20);
    game.scene.add(c5);
    game.c5 = c5;
  },

  addPlanet: function(dist, angle, z, size, texture, pcolor) {
    //add horizontal bar
    let cx = 200;
    let cy = 0;

    let barColor = {r: 0.898, g: 0.651, b: 0.278};

    let g = new THREE.BoxGeometry(dist, 0.5, 0.5);
    let m = new THREE.MeshBasicMaterial( {userData: barColor} );
    let hbar = new THREE.Mesh(g, m);
    let x = dist*0.5*Math.cos(angle) + cx;
    let y = dist*0.5*Math.sin(angle) + cy;
    hbar.position.set(x, y, z);
    hbar.rotateZ(angle);
    game.scene.add(hbar);

    //add vertical bar
    g = new THREE.BoxGeometry(0.5, 0.5, 10);
    m = new THREE.MeshBasicMaterial( {userData: barColor});
    let vbar = new THREE.Mesh(g, m);
    x = dist * Math.cos(angle) + cx;
    y = dist * Math.sin(angle) + cy;
    vbar.position.set(x, y, z+5);
    vbar.rotateZ(angle);
    game.scene.add(vbar);

    //add planet with texture
    g = new THREE.SphereGeometry(size, 25, 25);
    if (pcolor === undefined) {
      pcolor = {r: 1, g: 1, b: 1};
    }
    m = new THREE.MeshBasicMaterial( {map: texture, userData: pcolor});
    let planet = new THREE.Mesh(g, m);
    planet.position.set(x, y, z + 10 + size );
    planet.rotateZ(angle * 33);
    planet.rotateY(angle * 77);
    game.scene.add(planet);

    //put everything in game.darkMaterials array
    game.darkMaterials.push(hbar.material);
    game.darkMaterials.push(vbar.material);
    game.darkMaterials.push(planet.material);
  },

  setLensFlair: function(v) {
    game.lensFlairs.forEach( f => {
      f.color.r = v;
      f.color.g = v;
      f.color.b = v;
    });
    game.sunLight.intensity = v * 1.5;
  },

  update5: function(t,timeString,enabled) {
    let ctx = game.ctx5;
    let alpha = 1;
    let percent = (t.getMinutes() % 5) / 5 + t.getSeconds() / (60 * 5) + t.getMilliseconds() / (60 * 5 * 1000);
    let minutes = t.getMinutes();
    let alphaPower = minutes > 55 ? 1.5 : 0.5;

    alpha = Math.pow(Math.cos(percent * Math.PI/2),alphaPower) * enabled;
    if (alpha < 0.1) {
      alpha = 0;
      //move it out of the way so it doesn't cross one of the planet arms
      game.c5.position.y = 1000;
    } else {
      game.c5.position.y = 0;
    }

    ctx.clearRect(0,0,256,256);
    ctx.fillStyle = 'yellow';
    ctx.font = '40pt Arial';
    ctx.fillStyle = `rgba(249,247,132,${alpha})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    game.textAtPointAndAngle(ctx, 120, 128, -Math.PI * 0.5, timeString);
    game.textures.c5.needsUpdate = true;

    game.c5.position.z = Math.pow(Math.cos(percent * Math.PI/2),0.7) * 80;
    game.c5.position.x = Math.pow(Math.cos(percent * Math.PI/2),0.7) * 90 + 100;
    let scale = 0.75*Math.pow(Math.sin(percent * Math.PI/2),0.5)+0.25;
    game.c5.scale.set(scale,scale,scale);
  },

  last5: undefined,
  last5TimeString: '00:00',
  last5Enabled: 0,

  tick: function() {

    let timeScale = 1;
    let timeOffset = game.timeOffset | 0;

    let curTime = new Date();
    curTime.setTime(curTime.getTime() * timeScale + timeOffset);

    let hourPercent = (curTime.getMinutes() / 60 + curTime.getSeconds() / 3600 + curTime.getMilliseconds() / 3600000);
    let curMinute = curTime.getMinutes();
    if (curMinute % 5 === 0) {
      if (game.last5 !== curMinute) {
        if (curMinute !== 0) {
          let timeString = game.getTimeString(curTime);
          game.last5TimeString = timeString;
          game.last5 = curMinute;
          game.last5Enabled = 1;
        } else {
          game.last5Enabled = 0;
        }
      }
    }


    if (game.startEclipse) {
      game.startEclipse = false;
      game.poffset = 100 - hourPercent * 100 - 1  ;
      game.last5Enabled = 0;
    }

    game.update5(curTime,game.last5TimeString,game.last5Enabled);

    let poffset = game.poffset !== 0 ? game.poffset / 100 : 0;
    hourPercent += poffset;
    while (hourPercent > 1) {
      hourPercent -= 1;
    }

    game.updateClockImage(curTime);

    let flairValue = Math.pow(Math.sin(hourPercent * Math.PI),0.1);
    let skyValue = Math.pow(Math.sin(hourPercent * Math.PI), 0.2);
    skyValue = Math.max(0,(Math.pow(Math.sin(hourPercent * Math.PI), 0.1)- 0.6)/0.4);

    let darkBigPercent = 0.998063055555;
    let darkSmallPercent = 1 - darkBigPercent; //0.001937777
    if (skyValue < 0.001) {
      let darkPercent;
      if (hourPercent >= darkBigPercent) {
        darkPercent = (hourPercent - darkBigPercent) / (darkSmallPercent * 2);
      } else {
        darkPercent = (hourPercent+ darkSmallPercent) / (darkSmallPercent * 2);
      }
      let darkColor = 0.8 * Math.sin(darkPercent * Math.PI);
      game.stars.material.opacity = darkColor;
      let eclipseHour = new Date();
      if (curTime.getMinutes() > 30) {
        eclipseHour.setTime(Math.ceil(curTime.getTime() / (60*60*1000)) * (60*60*1000));
      } else {
        eclipseHour.setTime(Math.floor(curTime.getTime() / (60*60*1000)) * (60*60*1000));
      }
      let timeString = game.getTimeString(eclipseHour);
      game.updateCanvasImage(timeString, Math.sin(darkPercent * Math.PI));
      game.darkMaterials.forEach( m => {
        m.visible = true;
        if (m.userData.r !== undefined) {
          m.color.r = m.userData.r * darkColor;
          m.color.g = m.userData.g * darkColor;
          m.color.b = m.userData.b * darkColor;
        } else {
          m.color.r = darkColor;
          m.color.g = darkColor;
          m.color.b = darkColor;
        }
        m.opacity = darkColor;
        m.transparent = true;
      });
      game.ground.material.color.r = 1-darkColor;
      game.ground.material.color.g = 1-darkColor;
      game.ground.material.color.b = 1-darkColor;
      game.clockMaterials.forEach( m => {
        m.color.r = 1-darkColor;
        m.color.g = 1-darkColor;
        m.color.b = 1-darkColor;
      });
    } else {
      game.darkMaterials.forEach( m => {
        m.visible = false;
      });
      game.ground.material.color.r = 1;
      game.ground.material.color.g = 1;
      game.ground.material.color.b = 1;
      game.stars.material.opacity = 0;
      game.clockMaterials.forEach( m => {
        m.color.r = 1;
        m.color.g = 1;
        m.color.b = 1;
      });
    }

    game.skym.color.r = skyValue;
    game.skym.color.g = skyValue;
    game.skym.color.b = skyValue;


    game.setLensFlair(flairValue);

    let moony = 500 * Math.sin(-hourPercent * Math.PI * 2);
    let moonx = game.sundist-20;
    let moonz = 90 * Math.cos(hourPercent * Math.PI * 2);

    game.moon.position.set(moonx, moony, moonz);

    let renderWidth = game.renderer.domElement.width;
    let renderHeight = game.renderer.domElement.height;

    let lastPosition = {x: game.player.x, y: game.player.y, z: game.player.z};

    Object.keys(game.downKeys).forEach(k => {
      switch (k) {
        /*
        case 'w':
          //forward
          game.player.y += game.player.hspeed * Math.cos(game.player.hangle);
          game.player.x += game.player.hspeed * Math.sin(game.player.hangle);
          break;
        case 's':
          game.player.y -= game.player.hspeed * Math.cos(game.player.hangle);
          game.player.x -= game.player.hspeed * Math.sin(game.player.hangle);
          break;
        case 'a':
          game.player.y += game.player.hspeed * Math.cos(game.player.hangle - Math.PI * 0.5);
          game.player.x += game.player.hspeed * Math.sin(game.player.hangle - Math.PI * 0.5);
          break;
        case 'd':
          game.player.y += game.player.hspeed * Math.cos(game.player.hangle + Math.PI * 0.5);
          game.player.x += game.player.hspeed * Math.sin(game.player.hangle + Math.PI * 0.5);
          break;
        */
        case 'e':
          game.startEclipse = true;
          break;
        case 'r':
          game.poffset = 0;
          break;
        case ' ':
          break;
        default:
          //do nothing with unhandled keys
      }
    });


  },

  draw: function() {
    let eyeHeight = 1;
    game.camera.position.y = game.player.y;
    game.camera.position.z = game.player.z + eyeHeight;
    game.camera.position.x = game.player.x;

    game.camera.up = new THREE.Vector3(0,0,1);

    game.camera.lookAt(new THREE.Vector3(
      game.player.x + Math.sin(game.player.hangle) * Math.cos(game.player.vangle),
      game.player.y + Math.cos(game.player.hangle) * Math.cos(game.player.vangle),
      game.player.z + eyeHeight + Math.sin(game.player.vangle)));


    game.plight.position.y = game.player.y;
    game.plight.position.z = game.player.z + 1;
    game.plight.position.x = game.player.x;

    game.renderer.render( game.scene, game.camera );

    requestAnimationFrame(game.draw);
  },

  loadTexture: function(name, url) {
    game.unloadedTextures += 1;
    game.textures[name] = new THREE.TextureLoader().load(url, () => {game.textureLoaded(name);});
  },

  textureLoaded: function(name) {
    console.log('texture', name, 'loaded');
    game.unloadedTextures -= 1;
    if (game.unloadedTextures === 0) {
      document.getElementById('h1loading').style.display = 'none';
      setInterval(game.tick, 1/15);
      game.draw();
    }
  },

  keydown: function(event) {
    game.downKeys[event.key] = true;
  },

  keyup: function(event) {
    delete game.downKeys[event.key];
  },

  mousemove: function(event) {
    let canvas = game.renderer.domElement;

    let vMoveScale = 0.001;
    let hMoveScale = 0.005;
    let maxVangle = 1.56679; //must be slightly smaller than PI/2 for some reason
    let minHangle = 0.906;
    let maxHangle = 2.221;
    game.player.hangle += Math.max(-10,Math.min(10, event.movementX)) * hMoveScale;
    game.player.hangle = Math.max(minHangle, Math.min(maxHangle, game.player.hangle));
    game.player.vangle -= event.movementY * vMoveScale;
    game.player.vangle = Math.max(Math.min(game.player.vangle, maxVangle), -maxVangle);
  },

  pointerlockchange: function(event) {
    if (document.pointerLockElement === game.renderer.domElement) {
      console.log('pointer lock enabled');
      document.addEventListener('mousemove', game.mousemove);
    } else {
      console.log('pointer lock disabled');
      document.removeEventListener('mousemove', game.mousemove);
    }
  },

  pointerlockerror: function(event) {
    console.log('pointerlockerror', event);
  },

  mousedown: function(event) {
    game.renderer.domElement.requestPointerLock();
  },

  touchstart: function(event) {
    game.touchCount ++;
    if (game.touchCount >= 5) {
      game.touchCount = 0;
      if (game.poffset === 0) {
        game.startEclipse = true;
      } else {
        game.poffset = 0;
      }
    }
  }

};

game.init();
