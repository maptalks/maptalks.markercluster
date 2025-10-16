import * as maptalks from 'maptalks';
import { reshader } from '@maptalks/gl';
import { getVectorPacker, PointLayerRenderer } from '@maptalks/vt';
import vert from './glsl/sprite.vert';
import frag from './glsl/sprite.frag';
import wgslVert from './wgsl/sprite_vert.wgsl';
import wgslFrag from './wgsl/sprite_frag.wgsl';

const FONT_CANVAS = document.createElement('canvas');
const fontCtx = FONT_CANVAS.getContext('2d');
const ZERO_POINT = new maptalks.Point(0, 0);

const MarkerLayerClazz = maptalks.DrawToolLayer.markerLayerClazz;
let renderer = 'canvas';
const RendererClazz = MarkerLayerClazz.getRendererClass('canvas');
if (!RendererClazz) {
    renderer = 'gl';
}

const options = {
    'renderer': renderer,
    'maxClusterRadius' : 160,
    'textSumProperty' : null,
    'symbol' : null,
    'drawClusterText' : true,
    'textSymbol' : null,
    'animation' : true,
    'animationDuration' : 450,
    'maxClusterZoom' : null,
    'noClusterWithOneMarker':true,
    'forceRenderOnZooming' : true
};

export class ClusterLayer extends MarkerLayerClazz {
    /**
     * Reproduce a ClusterLayer from layer's profile JSON.
     * @param  {Object} json - layer's profile JSON
     * @return {maptalks.ClusterLayer}
     * @static
     * @private
     * @function
     */
    static fromJSON(json) {
        if (!json || json['type'] !== 'ClusterLayer') { return null; }
        const layer = new ClusterLayer(json['id'], json['options']);
        const geoJSONs = json['geometries'];
        const geometries = [];
        for (let i = 0; i < geoJSONs.length; i++) {
            const geo = maptalks.Geometry.fromJSON(geoJSONs[i]);
            if (geo) {
                geometries.push(geo);
            }
        }
        layer.addGeometry(geometries);
        return layer;
    }

    addMarker(markers) {
        return this.addGeometry(markers);
    }

    addGeometry(markers) {
        for (let i = 0, len = markers.length; i < len; i++) {
            if (!(markers[i] instanceof maptalks.Marker)) {
                throw new Error('Only a point(Marker) can be added into a ClusterLayer');
            }
        }
        return super.addGeometry.apply(this, arguments);
    }

    onConfig(conf) {
        super.onConfig(conf);
        if (conf['maxClusterRadius'] ||
            conf['symbol'] ||
            conf['drawClusterText'] ||
            conf['textSymbol'] ||
            conf['maxClusterZoom']) {
            const renderer = this._getRenderer();
            if (renderer) {
                renderer.render();
            }
        }
        return this;
    }

    /**
     * Identify the clusters on the given coordinate
     * @param  {maptalks.Coordinate} coordinate   - coordinate to identify
     * @return {Object|Geometry[]}  result: cluster { center : [cluster's center], children : [geometries in the cluster] } or markers
     */
    identify(coordinate, options) {
        const map = this.getMap(),
            maxZoom = this.options['maxClusterZoom'];
        if (maxZoom && map && map.getZoom() > maxZoom) {
            return super.identify(coordinate, options);
        }
        if (this._getRenderer()) {
            return this._getRenderer().identify(coordinate, options);
        }
        return null;
    }

    /**
     * Export the ClusterLayer's JSON.
     * @return {Object} layer's JSON
     */
    toJSON() {
        const json = super.toJSON.call(this);
        json['type'] = 'ClusterLayer';
        return json;
    }
    /**
     * Get the ClusterLayer's current clusters
     * @return {Object} layer's clusters
     **/
    getClusters() {
        const renderer = this._getRenderer();
        if (renderer) {
            return renderer._currentClusters || [];
        }
        return [];
    }
}

// merge to define ClusterLayer's default options.
ClusterLayer.mergeOptions(options);

// register ClusterLayer's JSON type for JSON deserialization.
ClusterLayer.registerJSONType('ClusterLayer');

const defaultTextSymbol = {
    'textFaceName'      : '"microsoft yahei"',
    'textSize'          : 16,
    'textDx'            : 0,
    'textDy'            : 0
};

const defaultSymbol = {
    'markerType' : 'ellipse',
    'markerFill' : { property:'count', type:'interval', stops: [[0, 'rgb(135, 196, 240)'], [9, '#1bbc9b'], [99, 'rgb(216, 115, 149)']] },
    'markerFillOpacity' : 0.7,
    'markerLineOpacity' : 1,
    'markerLineWidth' : 3,
    'markerLineColor' : '#fff',
    'markerWidth' : { property:'count', type:'interval', stops: [[0, 40], [9, 60], [99, 80]] },
    'markerHeight' : { property:'count', type:'interval', stops: [[0, 40], [9, 60], [99, 80]] }
};

const ClusterLayerRenderable = function(Base) {
    const renderable = class extends Base {
        init() {
            this._refreshStyle();
            this._clusterNeedRedraw = true;
        }

        checkResources() {
            if (!super.checkResources) {
                return [];
            }
            const symbol = this.layer.options['symbol'] || defaultSymbol;
            const resources = super.checkResources.apply(this, arguments);
            if (symbol !== this._symbolResourceChecked) {
                const res = maptalks.Util.getExternalResources(symbol, true);
                if (res) {
                    resources.push.apply(resources, res);
                }
                this._symbolResourceChecked = symbol;
            }
            return resources;
        }

        draw() {
            if (!this.canvas) {
                this.prepareCanvas();
            }
            const map = this.getMap();
            const zoom = map.getZoom();
            const maxClusterZoom = this.layer.options['maxClusterZoom'];
            if (maxClusterZoom &&  zoom > maxClusterZoom) {
                delete this._currentClusters;
                this.checkMarksToDraw();
                super.draw.apply(this, arguments);
                return;
            }
            if (this._clusterNeedRedraw) {
                this._clearDataCache();
                this._computeGrid();
                this._clusterNeedRedraw = false;
            }
            let clusters;
            if (this._triggerAnimate) {
                this._startAnimation(zoom);
            }
            if (this._animateDelta) {
                clusters = this._animateClusters;
            } else {
                const zoomClusters = this._clusterCache[zoom] ? this._clusterCache[zoom]['clusters'] : null;
                clusters = this.getClustersToDraw(zoomClusters);
                clusters.zoom = zoom;
            }
            this._drawLayer(clusters);
        }

        _startAnimation(zoom) {
            const zoomClusters = this._clusterCache[zoom] ? this._clusterCache[zoom]['clusters'] : null;
            const clusters = this.getClustersToDraw(zoomClusters);
            clusters.zoom = zoom;

            this._animateClusters = clusters;
            this._parentClusters = this._currentClusters || clusters;
            const layer = this.layer;
            if (layer.options['animation'] && this._triggerAnimate) {
                let dr = [0, 1];
                if (this._inout === 'in') {
                    dr = [1, 0];
                }
                this._animateDelta = dr[0];
                this._player = maptalks.animation.Animation.animate(
                    { 'd' : dr },
                    { 'speed' : layer.options['animationDuration'], 'easing' : 'inAndOut' },
                    frame => {
                        this._animateDelta = frame.styles.d;
                        if (frame.state.playState === 'finished') {
                            delete this._animateDelta;
                            delete this._inout;
                            delete this._animateClusters;
                            delete this._parentClusters
                        }
                        this.setToRedraw();
                    }
                )
                .play();
                this.setToRedraw();
            }
            this._triggerAnimate = false;
        }

        checkMarksToDraw() {
            const dirty = this._markersToDraw !== this.layer._geoList;
            this._markersToDraw = this.layer._geoList;
            this._markersToDraw.dirty = dirty;
        }

        getClustersToDraw(zoomClusters) {
            const oldMarkersToDraw = this._markersToDraw || [];
            this._markersToDraw = [];
            const map = this.getMap();
            const font = maptalks.StringUtil.getFont(this._textSymbol),
                digitLen = maptalks.StringUtil.stringLength('9', font).toPoint();
            const extent = map.getContainerExtent(),
                clusters = [];
            let pt, pExt, sprite, width, height, markerIndex = 0, isMarkerDirty = false;
            for (const p in zoomClusters) {
                this._currentGrid = zoomClusters[p];
                if (zoomClusters[p]['count'] === 1 && this.layer.options['noClusterWithOneMarker']) {
                    const marker = zoomClusters[p]['children'][0];
                    marker._cluster = zoomClusters[p];
                    if (!isMarkerDirty && oldMarkersToDraw[markerIndex++] !== marker) {
                        isMarkerDirty = true;
                    }
                    this._markersToDraw.push(marker);
                    continue;
                }
                sprite = this._getSprite().sprite;
                width = sprite.canvas.width;
                height = sprite.canvas.height;
                pt = map._prjToContainerPoint(zoomClusters[p]['center']);
                pExt = new maptalks.PointExtent(pt.sub(width, height), pt.add(width, height));
                if (!extent.intersects(pExt)) {
                    continue;
                }
                if (!zoomClusters[p]['textSize']) {
                    const text = this._getClusterText(zoomClusters[p]);
                    zoomClusters[p]['textSize'] = new maptalks.Point(digitLen.x * text.length, digitLen.y)._multi(1 / 2);
                }
                clusters.push(zoomClusters[p]);
            }
            if (oldMarkersToDraw.length !== this._markersToDraw.length) {
                isMarkerDirty = true;
            }
            this._markersToDraw.dirty = isMarkerDirty;
            return clusters;
        }

        drawOnInteracting(...args) {
            if (this._currentClusters) {
                this.drawClusters(this._currentClusters, 1);
            }
            super.drawOnInteracting(...args);
        }

        getCurrentNeedRenderGeos() {
            if (this._markersToDraw) {
                return this._markersToDraw;
            }
            return [];
        }

        _getCurrentNeedRenderGeos() {
            return this.getCurrentNeedRenderGeos();
        }

        forEachGeo(fn, context) {
            if (this._markersToDraw) {
                this._markersToDraw.forEach((g) => {
                    if (context) {
                        fn.call(context, g);
                    } else {
                        fn(g);
                    }
                });
            }
        }

        onGeometryShow() {
            this._clusterNeedRedraw = true;
            super.onGeometryShow.apply(this, arguments);
        }

        onGeometryHide() {
            this._clusterNeedRedraw = true;
            super.onGeometryHide.apply(this, arguments);
        }

        onGeometryAdd() {
            this._clusterNeedRedraw = true;
            super.onGeometryAdd.apply(this, arguments);
        }

        onGeometryRemove() {
            this._clusterNeedRedraw = true;
            super.onGeometryRemove.apply(this, arguments);
        }

        onGeometryPositionChange() {
            this._clusterNeedRedraw = true;
            super.onGeometryPositionChange.apply(this, arguments);
        }

        onRemove() {
            this._clearDataCache();
        }

        identify(coordinate, options) {
            const map = this.getMap(),
                maxZoom = this.layer.options['maxClusterZoom'];
            if (maxZoom && map.getZoom() > maxZoom) {
                return super.identify(coordinate, options);
            }
            if (this._currentClusters) {
                const point = map.coordinateToContainerPoint(coordinate);
                const old = this._currentGrid;
                for (let i = 0; i < this._currentClusters.length; i++) {
                    const c = this._currentClusters[i];
                    const pt = map._prjToContainerPoint(c['center']);
                    this._currentGrid = c;
                    const markerWidth = this._getSprite().sprite.canvas.width;

                    if (point.distanceTo(pt) <= markerWidth) {
                        return {
                            'center'   : map.getProjection().unproject(c.center.copy()),
                            'children' : c.children.slice(0)
                        };
                    }
                }
                this._currentGrid = old;
            }

            // if no clusters is hit, identify markers
            if (this._markersToDraw && this._markersToDraw[0]) {
                const point = map.coordinateToContainerPoint(coordinate);
                return this.layer._hitGeos(this._markersToDraw, point, options);
            }
            return null;
        }

        onSymbolChanged() {
            this._refreshStyle();
            this._computeGrid();
            this._stopAnim();
            this.setToRedraw();
        }

        _refreshStyle() {
            const symbol = this.layer.options['symbol'] || defaultSymbol;
            const textSymbol = this.layer.options['textSymbol'] || defaultTextSymbol;
            const argFn =  () => [this.getMap().getZoom(), this._currentGrid];
            this._symbol = maptalks.MapboxUtil.loadFunctionTypes(symbol, argFn);
            this._textSymbol = maptalks.MapboxUtil.loadFunctionTypes(textSymbol, argFn);
        }

        _drawLayer(clusters) {
            this._currentClusters = clusters;
            if (this._animateDelta >= 0) {
                if (this._inout === 'in') {
                    this.drawClustersFrame(clusters, this._parentClusters, this._animateDelta);
                } else {
                    this.drawClustersFrame(this._parentClusters, clusters, this._animateDelta);
                }
            } else {
                this.drawClusters(clusters, 1);
            }
            this.drawMarkers();
            this.completeRender();
        }

        drawMarkers() {
            super.drawGeos();
        }

        drawClustersFrame(parentClusters, toClusters, ratio) {
            this.prepareCanvas();
            const map = this.getMap(),
                drawn = {};
            if (parentClusters) {
                parentClusters.forEach(c => {
                    const p = map._prjToContainerPoint(c['center']);
                    if (!drawn[c.key]) {
                        drawn[c.key] = 1;
                        this.drawCluster(p, c, 1 - ratio);
                    }
                });
            }
            if (ratio === 0 || !toClusters) {
                return;
            }
            const z = parentClusters.zoom,
                r = map._getResolution(z) * this.layer.options['maxClusterRadius'],
                min = this._markerExtent.getMin();
            toClusters.forEach(c => {
                let pt = map._prjToContainerPoint(c['center']);
                const center = c.center;
                const pgx = Math.floor((center.x - min.x) / r),
                    pgy = Math.floor((center.y - min.y) / r);
                const pkey = pgx + '_' + pgy;
                const parent = this._clusterCache[z] ? this._clusterCache[z]['clusterMap'][pkey] : null;
                if (parent) {
                    const pp = map._prjToContainerPoint(parent['center']);
                    pt = pp.add(pt.sub(pp)._multi(ratio));
                }
                this.drawCluster(pt, c, ratio > 0.5 ? 1 : ratio);
            });
        }

        drawClusters(clusters, ratio) {
            if (!clusters) {
                return;
            }
            this.prepareCanvas();
            const map = this.getMap();
            clusters.forEach(c => {
                const pt = map._prjToContainerPoint(c['center']);
                this.drawCluster(pt, c, ratio > 0.5 ? 1 : ratio);
            });

        }

        drawCluster(pt, cluster, op) {
            this._currentGrid = cluster;
            const ctx = this.context;
            const sprite = this._getSprite().sprite;
            const opacity = ctx.globalAlpha;
            if (opacity * op === 0) {
                return;
            }
            ctx.globalAlpha = opacity * op;
            if (sprite) {
                const pos = pt.add(sprite.offset)._sub(sprite.canvas.width / 2, sprite.canvas.height / 2);
                maptalks.Canvas.image(ctx, sprite.canvas, pos.x, pos.y);
            }

            if (this.layer.options['drawClusterText'] && cluster['textSize']) {
                maptalks.Canvas.prepareCanvasFont(ctx, this._textSymbol);
                ctx.textBaseline = 'middle';
                const dx = this._textSymbol['textDx'] || 0;
                const dy = this._textSymbol['textDy'] || 0;
                const text = this._getClusterText(cluster);
                maptalks.Canvas.fillText(ctx, text, pt.sub(cluster['textSize'].x, 0)._add(dx, dy));
            }
            ctx.globalAlpha = opacity;
        }

        _getClusterText(cluster) {
            const text = this.layer.options['textSumProperty'] ? cluster['textSumProperty'] : cluster['count'];
            return text + '';
        }

        _getSprite() {
            if (!this._spriteCache) {
                this._spriteCache = {};
            }
            const key = getSymbolStamp(this._symbol);
            if (!this._spriteCache[key]) {
                this._spriteCache[key] = new maptalks.Marker([0, 0], { 'symbol' : this._symbol })._getSprite(this.resources, this.getMap().CanvasClass);
            }
            return {
                sprite: this._spriteCache[key],
                key
            };
        }

        _initGridSystem() {
            const points = [];
            let extent, c;
            this.layer.forEach(g => {
                if (!g.isVisible()) {
                    return;
                }
                c = g._getPrjCoordinates();
                if (!extent) {
                    extent = g._getPrjExtent();
                } else {
                    extent = extent._combine(g._getPrjExtent());
                }
                points.push({
                    x : c.x,
                    y : c.y,
                    id : g._getInternalId(),
                    geometry : g
                });
            });
            this._markerExtent = extent;
            this._markerPoints = points;
        }

        _computeGrid() {
            const map = this.getMap(),
                zoom = map.getZoom();
            if (!this._markerExtent) {
                this._initGridSystem();
            }
            if (!this._clusterCache) {
                this._clusterCache = {};
            }
            const pre = map._getResolution(map.getMinZoom()) > map._getResolution(map.getMaxZoom()) ? zoom - 1 : zoom + 1;
            if (this._clusterCache[pre] && this._clusterCache[pre].length === this.layer.getCount()) {
                this._clusterCache[zoom] = this._clusterCache[pre];
            }
            if (!this._clusterCache[zoom]) {
                this._clusterCache[zoom] = this._computeZoomGrid(zoom);
            }
        }

        _computeZoomGrid(zoom) {
            if (!this._markerExtent) {
                return null;
            }
            const map = this.getMap(),
                r = map._getResolution(zoom) * this.layer.options['maxClusterRadius'],
                preT = map._getResolution(zoom - 1) ? map._getResolution(zoom - 1) * this.layer.options['maxClusterRadius'] : null;
            let preCache = this._clusterCache[zoom - 1];
            if (!preCache && zoom - 1 >= map.getMinZoom()) {
                this._clusterCache[zoom - 1] = preCache = this._computeZoomGrid(zoom - 1);
            }
            // 1. format extent of markers to grids with raidus of r
            // 2. find point's grid in the grids
            // 3. sum up the point into the grid's collection
            const points = this._markerPoints;
            const sumProperty = this.layer.options['textSumProperty'];
            const grids = {},
                min = this._markerExtent.getMin();
            let gx, gy, key,
                pgx, pgy, pkey;
            for (let i = 0, len = points.length; i < len; i++) {
                const geo = points[i].geometry;
                let sumProp = 0;

                if (sumProperty && geo.getProperties() && geo.getProperties()[sumProperty]) {
                    sumProp = geo.getProperties()[sumProperty];
                }

                gx = Math.floor((points[i].x - min.x) / r);
                gy = Math.floor((points[i].y - min.y) / r);
                key = gx + '_' + gy;
                if (!grids[key]) {
                    grids[key] = {
                        'sum' : new maptalks.Coordinate(points[i].x, points[i].y),
                        'center' : new maptalks.Coordinate(points[i].x, points[i].y),
                        'count' : 1,
                        'textSumProperty' : sumProp,
                        'children' :[geo],
                        'key' : key + ''
                    };
                    if (preT && preCache) {
                        pgx = Math.floor((points[i].x - min.x) / preT);
                        pgy = Math.floor((points[i].y - min.y) / preT);
                        pkey = pgx + '_' + pgy;
                        grids[key]['parent'] = preCache['clusterMap'][pkey];
                    }
                } else {

                    grids[key]['sum']._add(new maptalks.Coordinate(points[i].x, points[i].y));
                    grids[key]['count']++;
                    grids[key]['center'] = grids[key]['sum'].multi(1 / grids[key]['count']);
                    grids[key]['children'].push(geo);
                    grids[key]['textSumProperty'] += sumProp;
                }
            }
            return this._mergeClusters(grids, r / 2);
        }

        _mergeClusters(grids, r) {
            const clusterMap = {};
            for (const p in grids) {
                clusterMap[p] = grids[p];
            }

            // merge adjacent clusters
            const merging = {};

            const visited = {};
            // find clusters need to merge
            let c1, c2;
            for (const p in grids) {
                c1 = grids[p];
                if (visited[c1.key]) {
                    continue;
                }
                const gxgy = c1.key.split('_');
                const gx = +(gxgy[0]),
                    gy = +(gxgy[1]);
                //traverse adjacent grids
                for (let ii = -1; ii <= 1; ii++) {
                    for (let iii = -1; iii <= 1; iii++) {
                        if (ii === 0 && iii === 0) {
                            continue;
                        }
                        const key2 = (gx + ii) + '_' + (gy + iii);
                        c2 = grids[key2];
                        if (c2 && this._distanceTo(c1['center'], c2['center']) <= r) {
                            if (!merging[c1.key]) {
                                merging[c1.key] = [];
                            }
                            merging[c1.key].push(c2);
                            visited[c2.key] = 1;
                        }
                    }
                }
            }

            //merge clusters
            for (const m in merging) {
                const grid = grids[m];
                if (!grid) {
                    continue;
                }
                const toMerge = merging[m];
                for (let i = 0; i < toMerge.length; i++) {
                    if (grids[toMerge[i].key]) {
                        grid['sum']._add(toMerge[i].sum);
                        grid['count'] += toMerge[i].count;
                        grid['textSumProperty'] += toMerge[i].textSumProperty;
                        grid['children'] = grid['children'].concat(toMerge[i].children);
                        clusterMap[toMerge[i].key] = grid;
                        delete grids[toMerge[i].key];
                    }
                }
                grid['center'] = grid['sum'].multi(1 / grid['count']);
            }

            return {
                'clusters' : grids,
                'clusterMap' : clusterMap
            };
        }

        _distanceTo(c1, c2) {
            const x = c1.x - c2.x,
                y = c1.y - c2.y;
            return Math.sqrt(x * x + y * y);
        }

        _stopAnim() {
            if (this._player && this._player.playState !== 'finished') {
                this._player.finish();
            }
        }

        onZoomStart(param) {
            this._stopAnim();
            super.onZoomStart(param);
        }

        onZoomEnd(param) {
            if (this.layer.isEmpty() || !this.layer.isVisible()) {
                super.onZoomEnd.apply(this, arguments);
                return;
            }
            this._inout = param['from'] > param['to'] ? 'in' : 'out';
            this._triggerAnimate = true;
            this._computeGrid();
            super.onZoomEnd.apply(this, arguments);
        }

        _clearDataCache() {
            this._stopAnim();
            delete this._markerExtent;
            delete this._markerPoints;
            delete this._clusterCache;
            delete this._zoomInClusters;
        }
    };
    return renderable;
}

class ClusterLayerRenderer extends ClusterLayerRenderable(maptalks.renderer.VectorLayerCanvasRenderer) {

    constructor(...args) {
        super(...args);
        this.init();
    }
}

ClusterLayer.registerRenderer('canvas', ClusterLayerRenderer);

if (typeof PointLayerRenderer !== 'undefined') {
    class ClusterGLRenderer extends ClusterLayerRenderable(PointLayerRenderer) {
        constructor(...args) {
            super(...args);
            this.init();
        }

        drawOnInteracting(event, timestamp, parentContext) {
            if (this._currentClusters) {
                this.drawClusters(this._currentClusters, 1);
            }
            this.drawMarkers();
            PointLayerRenderer.prototype.draw.call(this, timestamp, parentContext);
        }

        drawClusters(...args) {
            this._clearToDraw();
            super.drawClusters(...args);
            this.flush();
        }

        drawClustersFrame(...args) {
            this._clearToDraw();
            super.drawClustersFrame(...args);
            this.flush();
        }

        _clearToDraw() {
            this.pointCount = 0;
            this.bufferIndex = 0;
            this.opacityIndex = 0;
            this.textIndex = 0;
        }

        drawCluster(pt, cluster, opacity) {
            this._currentGrid = cluster;
            const { sprite, key } = this._getSprite();
            const canvas = sprite.canvas;
            if (!sprite.data) {
                sprite.data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
            }
            if (!this.clusterSprites[key]) {
                this.clusterSprites[key] = sprite;
                this.textureDirty = true;
            }
            const pos = pt.add(sprite.offset)._sub(canvas.width / 2, canvas.height / 2);
            let x = pos.x;
            let y = pos.y;
            const map = this.getMap();
            const pixelRatio = map.getDevicePixelRatio();
            const height = map.height;
            x = x * pixelRatio;
            y = (height - y) * pixelRatio;
            const spriteW = sprite.data.width * pixelRatio;
            const spriteH = sprite.data.height * pixelRatio;

            this.addPoint(x, y, spriteW, spriteH, opacity, key);

            if (this.layer.options['drawClusterText']) {
                maptalks.Canvas.prepareCanvasFont(fontCtx, this._textSymbol);
                const fontKey = fontCtx.font + '-' + fontCtx.fillStyle;
                const text = this._getClusterText(cluster);
                const { sprite, key } = this._getTextSprite(text, fontKey);
                if (!this.clusterTextSprites[key]) {
                    this.clusterTextSprites[key] = sprite;
                    this.textTextureDirty = true;
                }
                this.addTextPoint(x + spriteW / 2, y - spriteH / 2, sprite.data.width * pixelRatio, sprite.data.height * pixelRatio, key);
            }
            this.pointCount++;

        }

        _getTextSprite(text, fontKey) {
            if (!this._textSpriteCache) {
                this._textSpriteCache = {};
            }
            const key = fontKey + '-' + text;
            if (!this._textSpriteCache[key]) {
                const dpr = this.getMap().getDevicePixelRatio();
                const metrics = fontCtx.measureText(text);
                const textWidth = metrics.width;
                const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
                const canvas = document.createElement('canvas');
                canvas.width = textWidth * dpr;
                canvas.height = textHeight * dpr;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.scale(dpr, dpr);
                maptalks.Canvas.prepareCanvasFont(ctx, this._textSymbol);
                ctx.textBaseline = 'top';
                ctx.fillText(text, 0, 0);
                const debugCanvas = document.getElementById('debug-text-sprite');
                if (debugCanvas) {
                    debugCanvas.width = canvas.width;
                    debugCanvas.height = canvas.height;
                    const ctx = debugCanvas.getContext('2d');
                    ctx.drawImage(canvas, 0, 0);
                }

                this._textSpriteCache[key] = {
                    canvas,
                    offset: ZERO_POINT,
                    data: ctx.getImageData(0, 0, canvas.width, canvas.height)
                };
            }
            return {
                sprite: this._textSpriteCache[key],
                key
            };
        }

        checkMarksToDraw() {
            super.checkMarksToDraw();
            this.drawMarkers();
        }

        drawMarkers() {
            if (this._markersToDraw.dirty) {
                this.rebuildGeometries();
                this._markersToDraw.dirty = false;
            }
        }

        flush(parentContext) {
            if (this.pointCount === 0) {
                return;
            }
            this._updateMesh();
            const fbo = parentContext && parentContext.renderTarget && context.renderTarget.fbo;
            this._clusterGeometry.setDrawCount(this.pointCount * 6);
            const { width, height } = this.canvas;
            const layerOpacity = this._getLayerOpacity();
            const uniforms = {
                resolution: [width, height],
                layerOpacity,
                dxDy: [0, 0]
            };
            this._renderer.render(this._spriteShader, uniforms, this._scene, fbo);

            if (this.layer.options['drawClusterText']) {
                this._textGeometry.setDrawCount(this.pointCount * 6);
                const dx = this._textSymbol['textDx'] || 0;
                const dy = this._textSymbol['textDy'] || 0;
                uniforms.dxDy = [dx, dy];
                this._renderer.render(this._spriteShader, uniforms, this._textScene, fbo);
            }
        }

        _updateMesh() {

            const isAtlasDirty = this.textureDirty;
            const atlas = this._genAtlas();
            this._updateTexCoord(atlas, isAtlasDirty);
            // text
            if (this.layer.options['drawClusterText']) {
                const isAtlasDirty = this.textTextureDirty;
                const textAtlas = this._genTextAtlas();
                this._updateTextTexCoord(textAtlas, isAtlasDirty);
            }

            this._updateGeometryData();
        }

        addPoint(x, y, width, height, opacity, key) {
            this._check();
            const w = width;
            const h = height;

            this.addVertex(x, y - h, opacity);
            this.addVertex(x + w, y - h, opacity);
            this.addVertex(x, y, opacity);
            this.addVertex(x, y, opacity);
            this.addVertex(x + w, y - h, opacity);
            this.addVertex(x + w, y, opacity);
            if (this.sprites[this.pointCount] !== key) {
                this.sprites[this.pointCount] = key;
                this.sprites.dirty = true;
            }
        }

        addVertex(x, y, opacity) {
            const positionBufferData = this.positionBufferData;
            if (positionBufferData[this.bufferIndex] !== x) {
                positionBufferData[this.bufferIndex] = x;
                positionBufferData.dirty = true;
            }
            this.bufferIndex++;
            if (positionBufferData[this.bufferIndex] !== y) {
                positionBufferData[this.bufferIndex] = y;
                positionBufferData.dirty = true;
            }
            this.bufferIndex++;

            const opacityBufferData = this.opacityBufferData;
            // opacity *= 255;
            // U8[0] = opacity;
            if (opacityBufferData[this.opacityIndex] !== opacity) {
                opacityBufferData[this.opacityIndex] = opacity;
                opacityBufferData.dirty = true;
            }
            this.opacityIndex++;
        }

        addTextPoint(x, y, width, height, key) {
            this._check();
            const dpr = this.getMap().getDevicePixelRatio();
            width /= dpr;
            height /= dpr;
            const w = width / 2;
            const h = height / 2;

            this.addTextVertex(x - w, y - h);
            this.addTextVertex(x + w, y - h);
            this.addTextVertex(x - w, y + h);
            this.addTextVertex(x - w, y + h);
            this.addTextVertex(x + w, y - h);
            this.addTextVertex(x + w, y + h);

            if (this.textSprites[this.pointCount] !== key) {
                this.textSprites[this.pointCount] = key;
                this.textSprites.dirty = true;
            }
        }

        addTextVertex(x, y) {
            const textPositionData = this.textPositionData;
            if (textPositionData[this.textIndex] !== x) {
                textPositionData[this.textIndex] = x;
                textPositionData.dirty = true;
            }
            this.textIndex++;
            if (textPositionData[this.textIndex] !== y) {
                textPositionData[this.textIndex] = y;
                textPositionData.dirty = true;
            }
            this.textIndex++;
        }

        _check() {
            if (this.pointCount >= this.maxPointCount - 1) {
                this.maxPointCount += 1024;
                const { positionBufferData, texCoordBufferData, opacityBufferData, textPositionData, textTexCoordData } = this._initBuffers();
                for (let i = 0; i < this.bufferIndex; i++) {
                    positionBufferData[i] = this.positionBufferData[i];
                    texCoordBufferData[i] = this.texCoordBufferData[i];
                    textPositionData[i] = this.textPositionData[i];
                    textTexCoordData[i] = this.textTexCoordData[i];
                }
                for (let i = 0; i < this.opacityIndex; i++) {
                    opacityBufferData[i] = this.opacityBufferData[i];
                }
                this.positionBufferData = positionBufferData;
                this.texCoordBufferData = texCoordBufferData;
                this.opacityBufferData = opacityBufferData;
                this.textPositionData = textPositionData;
                this.textTexCoordData = textTexCoordData;
            }
        }

        _updateGeometryData() {
            // icon
            if (this.positionBufferData.dirty) {
                this._clusterGeometry.updateData('aPosition', this.positionBufferData);
                // console.log(this.positionBufferData);
                this.positionBufferData.dirty = false;
            }
            if (this.opacityBufferData.dirty) {
                this._clusterGeometry.updateData('aOpacity', this.opacityBufferData);
                this._textGeometry.updateData('aOpacity', this.opacityBufferData);
                this.opacityBufferData.dirty = false;
            }
            if (this.texCoordBufferData.dirty) {
                this._clusterGeometry.updateData('aTexCoord', this.texCoordBufferData);
                this.texCoordBufferData.dirty = false;
            }

            // text
            if (this.textPositionData.dirty) {
                this._textGeometry.updateData('aPosition', this.textPositionData);
                this.textPositionData.dirty = false;
            }
            if (this.textTexCoordData.dirty) {
                this._textGeometry.updateData('aTexCoord', this.textTexCoordData);
                this.textTexCoordData.dirty = false;
            }
        }

        _updateTexCoord(atlas, isAtlasDirty) {
            if (!this.sprites.dirty && !isAtlasDirty) {
                return;
            }
            const { positions, image } = atlas;
            const { width, height } = image;
            this.texCoordIndex = 0;
            for (let i = 0; i < this.pointCount; i++) {
                const bin = positions[this.sprites[i]];
                const { tl, br } = bin;
                this._fillTexCoord(tl, br, width, height);
            }
            this.sprites.dirty = false;
        }

        _updateTextTexCoord(atlas, isAtlasDirty) {
            if (!this.textSprites.dirty && !isAtlasDirty) {
                return;
            }
            const { positions, image } = atlas;
            const { width, height } = image;
            this.textTexCoordIndex = 0;
            for (let i = 0; i < this.pointCount; i++) {
                const bin = positions[this.textSprites[i]];
                const { tl, br } = bin;
                this._fillTextTexCoord(tl, br, width, height);
            }
            this.textSprites.dirty = false;
        }

        _initTexture(data, width, height) {
            const config = {
                data,
                width,
                height,
                mag: 'linear',
                min: 'linear',
                premultiplyAlpha: true
            };
            if (this._clusterTexture) {
                if (this._clusterTexture.update) {
                    this._clusterTexture.update(config);
                } else {
                    this._clusterTexture(config);
                }
            } else {
                this._clusterTexture = this.device.texture(config);
            }
            this._clusterMesh.setUniform('sourceTexture', this._clusterTexture);
        }

        _initTextTexture(data, width, height) {
            const config = {
                data,
                width,
                height,
                mag: 'linear',
                min: 'linear',
                premultiplyAlpha: true
            };
            if (this._textTexture) {
                if (this._textTexture.update) {
                    this._textTexture.update(config);
                } else {
                    this._textTexture(config);
                }
            } else {
                this._textTexture = this.device.texture(config);
            }
            this._textMesh.setUniform('sourceTexture', this._textTexture);
        }

        _fillTexCoord(tl, br, texWidth, texHeight) {
            const u1 = tl[0] / texWidth;
            const v1 = br[1] / texHeight;
            const u2 = br[0] / texWidth;
            const v2 = tl[1] / texHeight;

            this.addVertexTexCoord(u1, v1);
            this.addVertexTexCoord(u2, v1);
            this.addVertexTexCoord(u1, v2);
            this.addVertexTexCoord(u1, v2);
            this.addVertexTexCoord(u2, v1);
            this.addVertexTexCoord(u2, v2);
        }

        _fillTextTexCoord(tl, br, texWidth, texHeight) {
            const u1 = tl[0] / texWidth;
            const v1 = br[1] / texHeight;
            const u2 = br[0] / texWidth;
            const v2 = tl[1] / texHeight;

            this.addTextTexCoord(u1, v1);
            this.addTextTexCoord(u2, v1);
            this.addTextTexCoord(u1, v2);
            this.addTextTexCoord(u1, v2);
            this.addTextTexCoord(u2, v1);
            this.addTextTexCoord(u2, v2);
        }

        _genAtlas() {
            if (!this.textureDirty) {
                return this.atlas;
            }
            const { IconAtlas, RGBAImage } = getVectorPacker();
            const icons = this.clusterSprites;
            const iconMap = {};
            for (const url in icons) {
                const icon = icons[url];
                const { width, height, data } = icon.data;
                const image = new RGBAImage({ width, height }, data);
                iconMap[url] = { data: image, pixelRatio: 1 };
            }
            const isWebGL1 = this.gl && (this.gl instanceof WebGLRenderingContext);
            this.atlas = new IconAtlas(iconMap, { nonPowerOfTwo: !isWebGL1 });
            this.textureDirty = false;
            const { image } = this.atlas;
            const { width, height } = image;
            this._initTexture(image.data, width, height);
            return this.atlas;
        }

        _genTextAtlas() {
            if (!this.textTextureDirty) {
                return this.textAtlas;
            }
            const { IconAtlas, RGBAImage } = getVectorPacker();
            const texts = this.clusterTextSprites;
            const textMap = {};
            for (const key in texts) {
                const textSprite = texts[key];
                const { width, height, data } = textSprite.data;
                const image = new RGBAImage({ width, height }, data);
                textMap[key] = { data: image, pixelRatio: 1 };
            }
            const isWebGL1 = this.gl && (this.gl instanceof WebGLRenderingContext);
            this.textAtlas = new IconAtlas(textMap, { nonPowerOfTwo: !isWebGL1 });
            const { image } = this.textAtlas;
            const { width, height } = image;
            this._initTextTexture(image.data, width, height);
            this.textTextureDirty = false;

            const debugCanvas = document.getElementById('debug-text-atlas');
            if (debugCanvas) {
                debugCanvas.width = width;
                debugCanvas.height = height;
                const ctx = debugCanvas.getContext('2d');
                ctx.putImageData(new ImageData(new Uint8ClampedArray(image.data.buffer), width, height), 0, 0);
            }

            return this.textAtlas;
        }

        addVertexTexCoord(u, v) {
            const texCoordBufferData = this.texCoordBufferData;
            if (texCoordBufferData[this.texCoordIndex] !== u) {
                texCoordBufferData[this.texCoordIndex] = u;
                texCoordBufferData.dirty = true;
            }
            this.texCoordIndex++;
            if (texCoordBufferData[this.texCoordIndex] !== v) {
                texCoordBufferData[this.texCoordIndex] = v;
                texCoordBufferData.dirty = true;
            }
            this.texCoordIndex++;
        }

        addTextTexCoord(u, v) {
            const textTexCoordData = this.textTexCoordData;
            if (textTexCoordData[this.textTexCoordIndex] !== u) {
                textTexCoordData[this.textTexCoordIndex] = u;
                textTexCoordData.dirty = true;
            }
            this.textTexCoordIndex++;
            if (textTexCoordData[this.textTexCoordIndex] !== v) {
                textTexCoordData[this.textTexCoordIndex] = v;
                textTexCoordData.dirty = true;
            }
            this.textTexCoordIndex++;
        }

        initContext() {
            // this.
            this._initClusterShader();
            this._initClusterMeshes();
            return super.initContext();
        }

        onRemove() {
            if (this._spriteShader) {
                this._spriteShader.dispose();
                delete this._spriteShader;
            }
            if (this._clusterMesh) {
                this._clusterMesh.dispose();
                delete this._clusterMesh;
            }
            if (this._clusterGeometry) {
                this._clusterGeometry.dispose();
                delete this._clusterGeometry;
            }
            if (this._textMesh) {
                this._textMesh.dispose();
                delete this._textMesh;
            }
            if (this._textGeometry) {
                this._textGeometry.dispose();
                delete this._textGeometry;
            }
            if (this._clusterTexture) {
                this._clusterTexture.destroy();
                delete this._clusterTexture;
            }
            if (this._textTexture) {
                this._textTexture.destroy();
                delete this._textTexture;
            }
            return super.onRemove();
        }

        _initClusterShader() {
            const viewport = {
                x : 0,
                y : 0,
                width : () => {
                    return this.canvas ? this.canvas.width : 1;
                },
                height : () => {
                    return this.canvas ? this.canvas.height : 1;
                }
            };

            const extraCommandProps = {
                viewport,
                depth: {
                    enable: false
                },
                blend: {
                    enable: true,
                    func: {
                        src: 1,
                        dst: 'one minus src alpha'
                    }
                }
            };

            this._spriteShader = new reshader.MeshShader({
                name: 'cluster-sprite',
                vert,
                frag,
                wgslVert,
                wgslFrag,
                extraCommandProps
            });
        }

        _initClusterMeshes() {
            this.maxPointCount = 1024;
            this.pointCount = 0;
            this.clusterSprites = {};
            this.clusterTextSprites = {};
            this.sprites = [];
            this.textSprites = [];
            this.spriteCluster = [];

            const {
                positionBufferData, texCoordBufferData, opacityBufferData,
                textPositionData, textTexCoordData
            } = this._initBuffers();
            this.positionBufferData = positionBufferData;
            this.texCoordBufferData = texCoordBufferData;
            this.opacityBufferData = opacityBufferData;
            this.textPositionData = textPositionData;
            this.textTexCoordData = textTexCoordData;

            this._clusterGeometry = new reshader.Geometry({
                aPosition: this.positionBufferData,
                aTexCoord: this.texCoordBufferData,
                aOpacity: this.opacityBufferData
            }, null, 0, {
                positionSize: 2
            });
            this._clusterGeometry.generateBuffers(this.device);
            this._clusterMesh = new reshader.Mesh(this._clusterGeometry);
            this._scene = new reshader.Scene([this._clusterMesh]);

            this._textGeometry = new reshader.Geometry({
                aPosition: this.textPositionData,
                aTexCoord: this.textTexCoordData,
                aOpacity: this.opacityBufferData
            }, null, 0, {
                positionSize: 2
            });
            this._textGeometry.generateBuffers(this.device);
            this._textMesh = new reshader.Mesh(this._textGeometry);
            this._textScene = new reshader.Scene([this._textMesh]);

            this._renderer = new reshader.Renderer(this.device);
        }

        _initBuffers() {
            const vertexSize = 2;
            const texCoordSize = 2;
            const opacitySize = 1;

            const positionBufferData = new Float32Array(this.maxPointCount * vertexSize * 6);
            const texCoordBufferData = new Float32Array(this.maxPointCount * texCoordSize * 6);
            const opacityBufferData = new Float32Array(this.maxPointCount * opacitySize * 6);
            // opacityBufferData.fill(255);

            const textPositionData = new Float32Array(this.maxPointCount * vertexSize * 6);
            const textTexCoordData = new Float32Array(this.maxPointCount * texCoordSize * 6);

            return { positionBufferData, texCoordBufferData, opacityBufferData, textPositionData, textTexCoordData };
        }

        _getLayerOpacity() {
            let layerOpacity = this.layer && this.layer.options['opacity'];
            if (maptalks.Util.isNil(layerOpacity)) {
                layerOpacity = 1;
            }
            return layerOpacity;
        }
    }
    ClusterLayer.registerRenderer('gl', ClusterGLRenderer);
}

function getSymbolStamp(symbol) {
    const values = [];
    for (const p in symbol) {
        if (p[0] === '_') {
            continue;
        }
        values.push(symbol[p]);
    }
    return values.join('|');
}
