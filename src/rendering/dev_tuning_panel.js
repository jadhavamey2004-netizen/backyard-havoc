import GUI from 'lil-gui';
// lil-gui 0.21 exposes its stylesheet through package metadata, but not through
// its ESM export map. A relative dependency path keeps Vite's CSS handling
// explicit while the containing module remains development-only.
import '../../node_modules/lil-gui/dist/lil-gui.css';

export function createDevTuningPanel(renderer) {
  const gui = new GUI({ title: 'Phase 13 visual tuning', autoPlace: false });
  gui.domElement.dataset.phase13DevTool = 'lil-gui';
  gui.domElement.style.position = 'fixed';
  gui.domElement.style.zIndex = '1000';
  gui.domElement.style.top = '12px';
  gui.domElement.style.right = '12px';
  document.body.appendChild(gui.domElement);

  const controls = {
    parallaxFactor: renderer.tuning.parallaxFactor,
    ambientTint: renderer.tuning.ambientTint,
    keyLightIntensity: renderer.tuning.keyLightIntensity,
    contactShadowOpacity: renderer.tuning.contactShadowOpacity,
    outlineMultiplier: renderer.tuning.outlineMultiplier,
    foregroundOpacity: renderer.tuning.foregroundOpacity,
    cameraVisualScale: renderer.tuning.cameraVisualScale,
    vfxAlpha: renderer.tuning.vfxAlpha
  };

  const change = key => value => renderer.setTuning(key, value);
  gui.add(controls, 'parallaxFactor', 0, 0.18, 0.005).onChange(change('parallaxFactor'));
  gui.addColor(controls, 'ambientTint').onChange(change('ambientTint'));
  gui.add(controls, 'keyLightIntensity', 0.2, 1.5, 0.05).onChange(change('keyLightIntensity'));
  gui.add(controls, 'contactShadowOpacity', 0, 0.5, 0.01).onChange(change('contactShadowOpacity'));
  gui.add(controls, 'outlineMultiplier', 0.5, 2, 0.05).onChange(change('outlineMultiplier'));
  gui.add(controls, 'foregroundOpacity', 0.25, 1, 0.05).onChange(change('foregroundOpacity'));
  gui.add(controls, 'cameraVisualScale', 0.92, 1.08, 0.01).onChange(change('cameraVisualScale'));
  gui.add(controls, 'vfxAlpha', 0, 1, 0.05).onChange(change('vfxAlpha'));
  gui.hide();
  return {
    setVisible(visible) {
      if (visible) gui.show();
      else gui.hide();
    },
    destroy() {
      gui.destroy();
    }
  };
}
