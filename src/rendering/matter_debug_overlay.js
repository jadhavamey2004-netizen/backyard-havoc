import Matter from 'matter-js';
import { Container, Graphics, Text } from 'pixi.js';

const { Composite } = Matter;

export class MatterDebugOverlay {
  constructor() {
    this.root = new Container({ label: 'phase13-matter-debug' });
    this.bodies = new Graphics({ label: 'phase13-matter-body-vertices' });
    this.playerBounds = new Graphics({ label: 'phase13-player-render-bounds' });
    this.labelRoot = new Container({ label: 'phase13-matter-labels' });
    this.labels = new Map();
    this.visible = false;
    this.root.visible = false;
    this.root.addChild(this.bodies, this.playerBounds, this.labelRoot);
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this.root.visible = this.visible;
  }

  render(frame) {
    if (!this.visible || !frame.matterWorld) return;
    this.bodies.clear();
    this.playerBounds.clear();
    const activeLabels = new Set();

    for (const body of Composite.allBodies(frame.matterWorld)) {
      if (!body.vertices?.length) continue;
      const points = body.vertices.map(vertex => [vertex.x, vertex.y]);
      const color = body.isStatic ? 0x4d8093 : 0xffd85c;
      this.bodies.poly(points).stroke({ color, width: 1.2, alpha: 0.9 });
      this.bodies.circle(body.position.x, body.position.y, 2.2).fill({ color: 0xffffff, alpha: 0.9 });

      const id = body.id;
      activeLabels.add(id);
      let label = this.labels.get(id);
      if (!label) {
        label = new Text({
          text: body.label || `body ${id}`,
          style: { fontFamily: 'Arial', fontSize: 9, fill: 0xf5f6df, stroke: { color: 0x24312b, width: 2 } }
        });
        label.label = `phase13-body-label-${id}`;
        this.labels.set(id, label);
        this.labelRoot.addChild(label);
      }
      label.text = body.label || `body ${id}`;
      label.position.set(body.position.x, body.position.y);
    }

    for (const [id, label] of this.labels) {
      if (activeLabels.has(id)) continue;
      this.labelRoot.removeChild(label);
      label.destroy();
      this.labels.delete(id);
    }

    // Player movement is kinematic in the existing game; this read-only box shows its visual/contact region.
    this.playerBounds.rect(frame.player.x - 19, frame.player.y - 119, 38, 132)
      .stroke({ color: 0x70e1bb, width: 1.5, alpha: 0.95 });
  }

  destroy() {
    this.root.destroy({ children: true });
    this.labels.clear();
  }
}
