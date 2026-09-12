import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  calculateBearing,
  bearingTo3DPosition,
  calculateDistanceMeters,
  formatDistance,
  bearingToCardinal
} from '../utils/geoUtils';
import { getImageCandidates, getCityNodes, findNode, formatCoord } from '../data/cityManifest';
import { Compass } from './Compass';
import { ZoomIn, ZoomOut, Maximize, Minimize, MapPin, Info, X, Navigation, RefreshCw } from 'lucide-react';

const MIN_FOV = 30;
const MAX_FOV = 100;
const DEFAULT_FOV = 75;
const ARROW_RADIUS = 20;
const ARROW_HEIGHT = -6;
const LABEL_HEIGHT = -3.4;
const DRAG_SENSITIVITY = 0.15;
const CLICK_MOVE_THRESHOLD_PX = 6;

/* ---------- texture builders (canvas -> THREE textures) ---------- */

function createChevronTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.35)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(128, 40);
  ctx.lineTo(200, 160);
  ctx.lineTo(160, 160);
  ctx.lineTo(128, 100);
  ctx.lineTo(96, 160);
  ctx.lineTo(56, 160);
  ctx.closePath();
  ctx.fillStyle = '#1a73e8';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineJoin = 'round';
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function createLabelTexture(title, subtitle) {
  const scale = 2;
  const width = 480;
  const height = 120;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  ctx.fillStyle = 'rgba(12, 14, 20, 0.82)';
  roundedRect(ctx, 6, 6, width - 12, height - 12, 18);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 28px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textBaseline = 'middle';
  let text = title;
  const maxWidth = width - 56;
  while (ctx.measureText(text).width > maxWidth && text.length > 4) {
    text = `${text.slice(0, -2).trimEnd()}…`;
  }
  ctx.fillText(text, 28, 44);

  ctx.fillStyle = '#8ab4f8';
  ctx.font = '500 22px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(subtitle, 28, 84);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, aspect: width / height };
}

/* ---------- component ---------- */

export function StreetViewViewer({
  city = 'rome',
  initialLat = null,
  initialLon = null,
  onLocationChange
}) {
  const cityNodes = useMemo(() => getCityNodes(city), [city]);

  const resolveInitial = () => {
    const requested = initialLat != null && initialLon != null ? findNode(city, initialLat, initialLon) : null;
    const node = requested || cityNodes[0];
    return node ? { lat: node.lat, lon: node.lon } : null;
  };

  const [currentLocation, setCurrentLocation] = useState(resolveInitial);
  const [heading, setHeading] = useState(0);
  const [fov, setFov] = useState(DEFAULT_FOV);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [showHint, setShowHint] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);

  const containerRef = useRef(null);
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const sphereMeshRef = useRef(null);
  const arrowsGroupRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const ndcRef = useRef(new THREE.Vector2());
  const chevronTextureRef = useRef(null);

  const lonRef = useRef(0);
  const latRef = useRef(0);
  const lastHeadingRef = useRef(-1);
  const hoveredRef = useRef(null);

  const pointersRef = useRef(new Map());
  const dragRef = useRef({ active: false, moved: false, startX: 0, startY: 0, startLon: 0, startLat: 0 });
  const pinchRef = useRef({ startDistance: 0, startFov: DEFAULT_FOV });

  const currentNode = useMemo(
    () => (currentLocation ? findNode(city, currentLocation.lat, currentLocation.lon) : null),
    [city, currentLocation]
  );

  const neighbors = useMemo(() => {
    if (!currentLocation) return [];
    return cityNodes
      .filter((node) => node.lat !== currentLocation.lat || node.lon !== currentLocation.lon)
      .map((node) => {
        const bearing = calculateBearing(currentLocation.lat, currentLocation.lon, node.lat, node.lon);
        const distance = calculateDistanceMeters(currentLocation.lat, currentLocation.lon, node.lat, node.lon);
        return { ...node, bearing, distance, id: `${formatCoord(node.lat)},${formatCoord(node.lon)}` };
      })
      .sort((a, b) => a.distance - b.distance);
  }, [cityNodes, currentLocation]);

  const applyFov = useCallback((nextFov) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const clamped = Math.max(MIN_FOV, Math.min(MAX_FOV, nextFov));
    camera.fov = clamped;
    camera.updateProjectionMatrix();
    setFov(Math.round(clamped));
  }, []);

  const navigateTo = useCallback(
    (node) => {
      if (!node) return;
      if (currentLocation) {
        lonRef.current = calculateBearing(currentLocation.lat, currentLocation.lon, node.lat, node.lon);
        latRef.current = 0;
      }
      setCurrentLocation({ lat: node.lat, lon: node.lon });
      if (onLocationChange) onLocationChange({ lat: node.lat, lon: node.lon });
    },
    [currentLocation, onLocationChange]
  );

  const setHovered = useCallback((object) => {
    const previous = hoveredRef.current;
    if (previous === object) return;
    if (previous) previous.scale.setScalar(1);
    if (object) object.scale.setScalar(1.15);
    hoveredRef.current = object;
    setHoveredNode(object ? object.userData.id : null);
    if (mountRef.current) mountRef.current.style.cursor = object ? 'pointer' : '';
  }, []);

  /* ---------- scene setup ---------- */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const width = mount.clientWidth || 1;
    const height = mount.clientHeight || 1;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(DEFAULT_FOV, width / height, 1, 1100);
    cameraRef.current = camera;
    const target = new THREE.Vector3();

    const geometry = new THREE.SphereGeometry(500, 64, 40);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x1b1f27 });
    const sphereMesh = new THREE.Mesh(geometry, material);
    // Rotate so the image centre column faces -Z (north at heading 0).
    sphereMesh.rotation.y = -Math.PI / 2;
    scene.add(sphereMesh);
    sphereMeshRef.current = sphereMesh;

    const arrowsGroup = new THREE.Group();
    scene.add(arrowsGroup);
    arrowsGroupRef.current = arrowsGroup;

    chevronTextureRef.current = createChevronTexture();

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      latRef.current = Math.max(-85, Math.min(85, latRef.current));
      lonRef.current = ((lonRef.current % 360) + 360) % 360;

      const phi = THREE.MathUtils.degToRad(90 - latRef.current);
      const theta = THREE.MathUtils.degToRad(lonRef.current);

      // Heading 0 looks down -Z (north); heading 90 looks down +X (east).
      target.set(500 * Math.sin(phi) * Math.sin(theta), 500 * Math.cos(phi), -500 * Math.sin(phi) * Math.cos(theta));
      camera.lookAt(target);

      const rounded = Math.round(lonRef.current) % 360;
      if (rounded !== lastHeadingRef.current) {
        lastHeadingRef.current = rounded;
        setHeading(rounded);
      }
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    const onWheel = (event) => {
      event.preventDefault();
      applyFov(camera.fov + event.deltaY * 0.05);
      setShowHint(false);
    };
    mount.addEventListener('wheel', onWheel, { passive: false });

    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      mount.removeEventListener('wheel', onWheel);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      if (sphereMesh.material.map) sphereMesh.material.map.dispose();
      geometry.dispose();
      material.dispose();
      chevronTextureRef.current?.dispose();
      renderer.dispose();
    };
  }, [applyFov]);

  /* ---------- panorama loading ---------- */
  useEffect(() => {
    const sphere = sphereMeshRef.current;
    if (!sphere || !currentLocation) return undefined;

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    const loader = new THREE.TextureLoader();
    const imageCandidates = getImageCandidates(city, currentNode || currentLocation);
    let candidateIndex = 0;

    const loadCandidate = () => {
      const imageUrl = imageCandidates[candidateIndex];
      loader.load(
        imageUrl,
        (texture) => {
        if (cancelled) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        const previous = sphere.material.map;
        sphere.material.map = texture;
        sphere.material.color.set(0xffffff);
        sphere.material.needsUpdate = true;
        if (previous) previous.dispose();
        setIsLoading(false);

        // Warm the browser cache for adjacent panoramas.
        cityNodes
          .filter((node) => node.lat !== currentLocation.lat || node.lon !== currentLocation.lon)
          .forEach((node) => {
            const img = new Image();
            img.src = getImageCandidates(city, node)[0];
          });
        },
        undefined,
        () => {
          if (cancelled) return;
          candidateIndex += 1;
          if (candidateIndex < imageCandidates.length) {
            loadCandidate();
            return;
          }
          setIsLoading(false);
          setLoadError(imageCandidates[0]);
        }
      );
    };

    loadCandidate();

    return () => {
      cancelled = true;
    };
  }, [city, cityNodes, currentLocation, reloadToken]);

  /* ---------- navigation arrows + 3D hotspots ---------- */
  useEffect(() => {
    const group = arrowsGroupRef.current;
    const chevronTexture = chevronTextureRef.current;
    if (!group || !chevronTexture) return undefined;

    const created = [];

    neighbors.forEach((node) => {
      const arrowPos = bearingTo3DPosition(node.bearing, ARROW_RADIUS, ARROW_HEIGHT);
      const arrow = new THREE.Mesh(
        new THREE.PlaneGeometry(3.5, 3.5),
        new THREE.MeshBasicMaterial({
          map: chevronTexture,
          transparent: true,
          side: THREE.DoubleSide,
          depthTest: false,
          depthWrite: false
        })
      );
      arrow.position.set(arrowPos.x, arrowPos.y, arrowPos.z);
      // Lay flat on the ground, then spin so the chevron points along the bearing.
      arrow.rotation.x = -Math.PI / 2;
      arrow.rotation.z = -THREE.MathUtils.degToRad(node.bearing);
      arrow.renderOrder = 2;

      const label = createLabelTexture(
        node.title,
        `${formatDistance(node.distance)} · ${bearingToCardinal(node.bearing)} ${Math.round(node.bearing)}°`
      );
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: label.texture, transparent: true, depthTest: false, depthWrite: false })
      );
      const labelPos = bearingTo3DPosition(node.bearing, ARROW_RADIUS, LABEL_HEIGHT);
      sprite.position.set(labelPos.x, labelPos.y, labelPos.z);
      const labelWidth = 6.5;
      sprite.scale.set(labelWidth, labelWidth / label.aspect, 1);
      sprite.renderOrder = 3;

      const userData = {
        id: node.id,
        lat: node.lat,
        lon: node.lon,
        title: node.title,
        distance: Math.round(node.distance),
        bearing: node.bearing
      };
      arrow.userData = userData;
      sprite.userData = userData;

      group.add(arrow, sprite);
      created.push(arrow, sprite);
    });

    return () => {
      setHovered(null);
      created.forEach((object) => {
        group.remove(object);
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (object.material.map && object.material.map !== chevronTexture) object.material.map.dispose();
          object.material.dispose();
        }
      });
    };
  }, [neighbors, setHovered]);

  /* ---------- pointer interaction ---------- */
  const updateNdc = (event) => {
    const rect = mountRef.current.getBoundingClientRect();
    ndcRef.current.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  };

  const pickHotspot = (event) => {
    if (!mountRef.current || !cameraRef.current || !arrowsGroupRef.current) return null;
    updateNdc(event);
    raycasterRef.current.setFromCamera(ndcRef.current, cameraRef.current);
    const hits = raycasterRef.current.intersectObjects(arrowsGroupRef.current.children, false);
    return hits.length > 0 ? hits[0].object : null;
  };

  const pointerDistance = () => {
    const [a, b] = Array.from(pointersRef.current.values());
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    setShowHint(false);
    mountRef.current?.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 2) {
      dragRef.current.active = false;
      pinchRef.current = { startDistance: pointerDistance(), startFov: cameraRef.current?.fov ?? DEFAULT_FOV };
      return;
    }

    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      startLon: lonRef.current,
      startLat: latRef.current
    };
  };

  const handlePointerMove = (event) => {
    const pointers = pointersRef.current;
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2) {
      const distance = pointerDistance();
      if (pinchRef.current.startDistance > 0) {
        const ratio = pinchRef.current.startDistance / distance;
        applyFov(pinchRef.current.startFov * ratio);
      }
      return;
    }

    const drag = dragRef.current;
    if (drag.active) {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) > CLICK_MOVE_THRESHOLD_PX) drag.moved = true;
      // Narrower FOV -> finer control, mirroring how Street View slows down when zoomed in.
      const fovScale = (cameraRef.current?.fov ?? DEFAULT_FOV) / DEFAULT_FOV;
      lonRef.current = drag.startLon - dx * DRAG_SENSITIVITY * fovScale;
      latRef.current = drag.startLat + dy * DRAG_SENSITIVITY * fovScale;
      return;
    }

    if (event.pointerType === 'mouse') setHovered(pickHotspot(event));
  };

  const handlePointerUp = (event) => {
    const pointers = pointersRef.current;
    pointers.delete(event.pointerId);
    mountRef.current?.releasePointerCapture?.(event.pointerId);

    const drag = dragRef.current;
    if (pointers.size === 0 && drag.active) {
      drag.active = false;
      if (!drag.moved) {
        const hit = pickHotspot(event);
        if (hit) {
          setHovered(null);
          navigateTo(hit.userData);
        }
      }
    }
    if (pointers.size < 2) pinchRef.current.startDistance = 0;
  };

  const handlePointerLeave = () => {
    setHovered(null);
  };

  const handleKeyDown = (event) => {
    const step = event.shiftKey ? 15 : 5;
    switch (event.key) {
      case 'ArrowLeft':
        lonRef.current -= step;
        break;
      case 'ArrowRight':
        lonRef.current += step;
        break;
      case 'ArrowUp':
        latRef.current += step;
        break;
      case 'ArrowDown':
        latRef.current -= step;
        break;
      case '+':
      case '=':
        applyFov((cameraRef.current?.fov ?? DEFAULT_FOV) - 10);
        break;
      case '-':
      case '_':
        applyFov((cameraRef.current?.fov ?? DEFAULT_FOV) + 10);
        break;
      default:
        return;
    }
    event.preventDefault();
    setShowHint(false);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.();
    }
  };

  const faceNorth = () => {
    lonRef.current = 0;
    latRef.current = 0;
  };

  /* ---------- render ---------- */
  if (!currentLocation) {
    return (
      <div className="streetview-container streetview-empty">
        <div className="empty-card">
          <MapPin size={28} className="icon-blue" />
          <h2>No panoramas for “{city}” yet</h2>
          <p>
            Add equirectangular JPEGs to <code>public/images/citystreetviews/{city}/</code> named{' '}
            <code>{'{lat},{lon}.jpg'}</code> and register them in <code>src/data/cityManifest.js</code>.
          </p>
        </div>
      </div>
    );
  }

  const zoomPercent = Math.round(((MAX_FOV - fov) / (MAX_FOV - MIN_FOV)) * 100);

  return (
    <div ref={containerRef} className={`streetview-container${isFullscreen ? ' is-fullscreen' : ''}`}>
      <div
        ref={mountRef}
        className={`streetview-canvas${isLoading ? ' is-transitioning' : ''}`}
        tabIndex={0}
        role="application"
        aria-label="360 degree panorama. Drag to look around, use arrow keys to rotate, click arrows to move."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleKeyDown}
      />

      {isLoading && (
        <div className="streetview-loader" aria-live="polite">
          <div className="spinner" />
          <span>Loading panorama…</span>
        </div>
      )}

      {loadError && !isLoading && (
        <div className="streetview-error" role="alert">
          <h3>Panorama not found</h3>
          <p>
            Expected an image at <code>{loadError}</code>. Check the file name matches the coordinates in the
            manifest.
          </p>
          <div className="error-actions">
            <button type="button" onClick={() => setReloadToken((n) => n + 1)}>
              <RefreshCw size={16} /> Retry
            </button>
            {neighbors[0] && (
              <button type="button" className="secondary" onClick={() => navigateTo(neighbors[0])}>
                <Navigation size={16} /> Go to nearest
              </button>
            )}
          </div>
        </div>
      )}

      <div className="hud-top">
        <div className="hud-badge">
          <MapPin size={16} className="icon-blue" />
          <span className="hud-city">{city.toUpperCase()}</span>
          <span className="hud-coords">
            {currentLocation.lat.toFixed(6)}, {currentLocation.lon.toFixed(6)}
          </span>
        </div>
      </div>

      <div className="hud-compass">
        <Compass heading={heading} onReset={faceNorth} />
      </div>

      <div className="hud-controls">
        <button type="button" onClick={() => applyFov(fov - 10)} disabled={fov <= MIN_FOV} title="Zoom in" aria-label="Zoom in">
          <ZoomIn size={18} />
        </button>
        <span className="zoom-readout" aria-hidden="true">
          {zoomPercent}%
        </span>
        <button type="button" onClick={() => applyFov(fov + 10)} disabled={fov >= MAX_FOV} title="Zoom out" aria-label="Zoom out">
          <ZoomOut size={18} />
        </button>
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          className={showInfo ? 'is-active' : ''}
          title={showInfo ? 'Hide location info' : 'Show location info'}
          aria-pressed={showInfo}
        >
          <Info size={18} />
        </button>
        <button type="button" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label="Toggle fullscreen">
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>

      {showInfo && (
        <aside className="hud-info">
          <div className="hud-info-header">
            <div>
              <p className="eyebrow">Current location</p>
              <h2>{currentNode?.title ?? 'Unregistered panorama'}</h2>
            </div>
            <button type="button" className="icon-button" onClick={() => setShowInfo(false)} aria-label="Close location info">
              <X size={16} />
            </button>
          </div>
          {currentNode?.description && <p className="hud-info-description">{currentNode.description}</p>}
          <p className="eyebrow">Connected locations</p>
          {neighbors.length === 0 ? (
            <p className="hud-info-muted">This is the only panorama in {city}.</p>
          ) : (
            <ul className="neighbor-list">
              {neighbors.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    className={hoveredNode === node.id ? 'is-hovered' : ''}
                    onClick={() => navigateTo(node)}
                  >
                    <Navigation size={14} style={{ transform: `rotate(${node.bearing - 45}deg)` }} />
                    <span className="neighbor-title">{node.title}</span>
                    <span className="neighbor-meta">
                      {formatDistance(node.distance)} · {bearingToCardinal(node.bearing)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}

      {showHint && !isLoading && !loadError && (
        <div className="hud-hint">Drag to look around · Scroll or pinch to zoom · Click a ground arrow to move</div>
      )}
    </div>
  );
}
