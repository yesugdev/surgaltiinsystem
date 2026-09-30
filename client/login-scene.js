/**
 * Нэвтрэх хуудасны 3D дэвсгэр: «мэдлэгийн орон зай».
 * Доор нь долгилох цэгэн талбай (GPU shader), дээгүүр нь аажуухан эргэлдэх олон талст дүрсүүд.
 * Эх файл: client/login-scene.js → `npm run build:client` → public/js/login-scene.js (зөвхөн ашигласан хэсгийг багцална)
 */
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  BufferGeometry,
  BufferAttribute,
  Points,
  ShaderMaterial,
  Color,
  IcosahedronGeometry,
  OctahedronGeometry,
  TetrahedronGeometry,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
  MeshStandardMaterial,
  Mesh,
  Group,
  AmbientLight,
  DirectionalLight,
  Clock,
  Vector3,
} from 'three';

const BRAND = '#2f5bea';
const BRAND_LIGHT = '#9db4ff';
const BRAND_DEEP = '#1c3aa8';
const BRAND_TEAL = '#0aa3a8'; // логоны сумны өнгө

function start() {
  const canvas = document.getElementById('login-bg');
  if (!canvas) return;

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    canvas.remove();
    document.documentElement.classList.add('no-webgl');
    return;
  }
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(48, 1, 0.1, 200);
  const baseCam = { x: 0, y: 6.5, z: 19 };
  camera.position.set(baseCam.x, baseCam.y, baseCam.z);
  camera.lookAt(0, 0, 0);

  // ---- Долгилох цэгэн талбай ----
  const COLS = 130;
  const ROWS = 76;
  const GAP = 0.42;
  const positions = new Float32Array(COLS * ROWS * 3);
  let i = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      positions[i++] = (x - COLS / 2) * GAP;
      positions[i++] = 0;
      positions[i++] = (y - ROWS / 2) * GAP;
    }
  }
  const fieldGeo = new BufferGeometry();
  fieldGeo.setAttribute('position', new BufferAttribute(positions, 3));
  const uniforms = {
    uTime: { value: 0 },
    uPixel: { value: pixelRatio },
    uColorA: { value: new Color(BRAND) },
    uColorB: { value: new Color(BRAND_LIGHT) },
  };
  const fieldMat = new ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixel;
      varying float vHeight;
      varying float vFade;
      void main() {
        vec3 p = position;
        float h = sin(p.x * 0.33 + uTime * 0.55) * 0.55
                + cos(p.z * 0.42 + uTime * 0.40) * 0.45
                + sin((p.x + p.z) * 0.16 + uTime * 0.28) * 0.75;
        p.y = h;
        vHeight = h;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.0 + h * 0.55) * uPixel * (19.0 / -mv.z);
        vFade = smoothstep(48.0, 12.0, -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying float vHeight;
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.12, d) * vFade;
        vec3 col = mix(uColorA, uColorB, clamp(vHeight * 0.38 + 0.5, 0.0, 1.0));
        gl_FragColor = vec4(col, alpha * 0.8);
      }
    `,
  });
  const field = new Points(fieldGeo, fieldMat);
  field.position.y = -2.2;
  scene.add(field);

  // ---- Эргэлдэх олон талст дүрсүүд ----
  scene.add(new AmbientLight(0xffffff, 1.4));
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(6, 10, 8);
  scene.add(sun);

  const shapes = [];
  // Дүрсийг дэлгэцийн харьцангуй байрлалаар (0..1) тавина — бичиг, карт дээр давхцахгүй.
  // desktop/mobile: [x, y, камераас зай]; mobile = null бол утсан дээр нуугдана.
  const makeShape = (geo, color, scale, speed, desktop, mobile) => {
    const g = new Group();
    const solid = new Mesh(geo, new MeshStandardMaterial({ color, flatShading: true, roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.92 }));
    const edges = new LineSegments(new EdgesGeometry(geo), new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
    g.add(solid, edges);
    g.userData = { scale, speed, desktop, mobile, phase: Math.random() * Math.PI * 2, baseY: 0 };
    scene.add(g);
    shapes.push(g);
  };
  makeShape(new IcosahedronGeometry(1, 0), BRAND, 1.25, 0.35, [0.05, 0.9, 20], null); // доод зүүн булан
  makeShape(new OctahedronGeometry(1, 0), BRAND_LIGHT, 0.75, 0.5, [0.5, 0.1, 26], [0.1, 0.05, 30]); // баганын завсар дээд
  makeShape(new TetrahedronGeometry(1, 0), BRAND_TEAL, 1.0, 0.42, [0.9, 0.1, 24], [0.9, 0.07, 30]); // картын ард, дээд баруун
  makeShape(new IcosahedronGeometry(1, 0), BRAND_LIGHT, 1.15, 0.3, [0.95, 0.9, 21], null); // доод баруун булан

  const tmp = new Vector3();
  function placeShapes(mobile) {
    // Параллаксгүй үндсэн камерын байрлалаас дэлгэцийн цэгийг 3D орон зай руу буулгана
    camera.position.set(baseCam.x, baseCam.y, camera.position.z);
    camera.lookAt(0, 0.5, 0);
    camera.updateMatrixWorld();
    shapes.forEach((s) => {
      const a = mobile ? s.userData.mobile : s.userData.desktop;
      s.visible = !!a;
      if (!a) return;
      tmp.set(a[0] * 2 - 1, -(a[1] * 2 - 1), 0.5).unproject(camera).sub(camera.position).normalize();
      s.position.copy(camera.position).addScaledVector(tmp, a[2]);
      s.userData.baseY = s.position.y;
      s.scale.setScalar(s.userData.scale * (mobile ? 0.7 : 1));
    });
  }

  // ---- Хэмжээ, хулгана ----
  const pointer = { x: 0, y: 0 };
  const cam = { x: 0, y: 0 };
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Нарийн (утасны) дэлгэцэд дүрсүүдийг төв рүү ойртуулж, камерыг холдуулна
    camera.position.z = baseCam.z + (camera.aspect < 1 ? 8 : 0);
    camera.updateProjectionMatrix();
    placeShapes(camera.aspect < 0.9);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX / window.innerWidth - 0.5;
    pointer.y = e.clientY / window.innerHeight - 0.5;
  });
  resize();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new Clock();
  let running = true;

  function frame() {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    shapes.forEach((s) => {
      const { baseY, speed, phase } = s.userData;
      s.rotation.x = t * speed * 0.6 + phase;
      s.rotation.y = t * speed + phase;
      s.position.y = baseY + Math.sin(t * speed * 1.4 + phase) * 0.45;
    });
    cam.x += (pointer.x * 2.4 - cam.x) * 0.04;
    cam.y += (-pointer.y * 1.4 - cam.y) * 0.04;
    camera.position.x = baseCam.x + cam.x;
    camera.position.y = baseCam.y + cam.y;
    camera.lookAt(0, 0.5, 0);
    renderer.render(scene, camera);
  }

  function loop() {
    if (!running) return;
    frame();
    requestAnimationFrame(loop);
  }

  if (reduceMotion) {
    uniforms.uTime.value = 2.0;
    frame(); // хөдөлгөөнгүй нэг кадр
    window.addEventListener('resize', frame);
  } else {
    loop();
    // Таб нуугдахад GPU-г чөлөөлнө
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) {
        clock.getDelta();
        loop();
      }
    });
  }
  document.documentElement.classList.add('scene-ready');
}

start();
