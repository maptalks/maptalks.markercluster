/*!
 * maptalks.markercluster v0.8.8
 * LICENSE : MIT
 * (c) 2016-2025 maptalks.org
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('maptalks'), require('@maptalks/gl'), require('@maptalks/vt')) :
    typeof define === 'function' && define.amd ? define(['exports', 'maptalks', '@maptalks/gl', '@maptalks/vt'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.maptalks = global.maptalks || {}, global.maptalks, global.maptalks, global.maptalks));
})(this, (function (exports, maptalks, gl, vt) { 'use strict';

    function _interopNamespace(e) {
        if (e && e.__esModule) return e;
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n["default"] = e;
        return Object.freeze(n);
    }

    var maptalks__namespace = /*#__PURE__*/_interopNamespace(maptalks);

    var vert = "attribute vec2 aPosition;\nattribute vec2 aTexCoord;\nattribute float aOpacity;\nuniform vec2 resolution;\nvarying vec2 vTexCoord;\nvarying float vOpacity;\nvoid main() {\n    vTexCoord = aTexCoord;\n    vOpacity = aOpacity / 255.0;\n    vec2 position = aPosition / resolution * 2.0 - 1.0;\n    gl_Position = vec4(position, 0.0, 1.0);\n}";

    var frag = "precision mediump float;\nuniform sampler2D spriteTexture;\nuniform float layerOpacity;\nvarying vec2 vTexCoord;\nvarying float vOpacity;\nvoid main() {\n    vec4 color = texture2D(spriteTexture, vTexCoord);\n    gl_FragColor = color * vOpacity * layerOpacity;\n}";

    const U8 = new Uint8Array(1);

    const MarkerLayerClazz = maptalks__namespace.DrawToolLayer.markerLayerClazz;
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

    class ClusterLayer extends MarkerLayerClazz {
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
                const geo = maptalks__namespace.Geometry.fromJSON(geoJSONs[i]);
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
                if (!(markers[i] instanceof maptalks__namespace.Marker)) {
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
                this._animated = true;
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
                    const res = maptalks__namespace.Util.getExternalResources(symbol, true);
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
                    const dirty = this._markersToDraw !== this.layer._geoList;
                    this._markersToDraw = this.layer._geoList;
                    this._markersToDraw.dirty = dirty;
                    super.draw.apply(this, arguments);
                    return;
                }
                if (this._clusterNeedRedraw) {
                    this._clearDataCache();
                    this._computeGrid();
                    this._clusterNeedRedraw = false;
                    this.clearContext();
                }
                const zoomClusters = this._clusterCache[zoom] ? this._clusterCache[zoom]['clusters'] : null;

                const clusters = this._getClustersToDraw(zoomClusters);
                clusters.zoom = zoom;
                this._drawLayer(clusters);
            }

            _getClustersToDraw(zoomClusters) {
                this._oldMarkersToDraw = this._markersToDraw || [];
                this._markersToDraw = [];
                const map = this.getMap();
                const font = maptalks__namespace.StringUtil.getFont(this._textSymbol),
                    digitLen = maptalks__namespace.StringUtil.stringLength('9', font).toPoint();
                const extent = map.getContainerExtent(),
                    clusters = [];
                let pt, pExt, sprite, width, height, markerIndex = 0, isMarkerDirty = false;
                for (const p in zoomClusters) {
                    this._currentGrid = zoomClusters[p];
                    if (zoomClusters[p]['count'] === 1 && this.layer.options['noClusterWithOneMarker']) {
                        const marker = zoomClusters[p]['children'][0];
                        marker._cluster = zoomClusters[p];
                        if (!isMarkerDirty && this._oldMarkersToDraw[markerIndex++] !== marker) {
                            isMarkerDirty = true;
                        }
                        this._markersToDraw.push(marker);
                        continue;
                    }
                    sprite = this._getSprite().sprite;
                    width = sprite.canvas.width;
                    height = sprite.canvas.height;
                    pt = map._prjToContainerPoint(zoomClusters[p]['center']);
                    pExt = new maptalks__namespace.PointExtent(pt.sub(width, height), pt.add(width, height));
                    if (!extent.intersects(pExt)) {
                        continue;
                    }

                    if (!zoomClusters[p]['textSize']) {
                        const text = this._getClusterText(zoomClusters[p]);
                        zoomClusters[p]['textSize'] = new maptalks__namespace.Point(digitLen.x * text.length, digitLen.y)._multi(1 / 2);
                    }
                    clusters.push(zoomClusters[p]);
                }
                if (this._oldMarkersToDraw.length !== this._markersToDraw.length) {
                    isMarkerDirty = true;
                }
                this._markersToDraw.dirty = isMarkerDirty;
                return clusters;
            }

            drawOnInteracting() {
                if (this._currentClusters) {
                    this.drawClusters(this._currentClusters, 1);
                }
                super.drawOnInteracting.apply(this, arguments);
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
                this._symbol = maptalks__namespace.MapboxUtil.loadFunctionTypes(symbol, argFn);
                this._textSymbol = maptalks__namespace.MapboxUtil.loadFunctionTypes(textSymbol, argFn);
            }

            _drawLayer(clusters) {
                const parentClusters = this._currentClusters || clusters;
                this._currentClusters = clusters;
                delete this._clusterMaskExtent;
                const layer = this.layer;
                //if (layer.options['animation'] && this._animated && this._inout === 'out') {
                if (layer.options['animation'] && this._animated && this._inout) {
                    let dr = [0, 1];
                    if (this._inout === 'in') {
                        dr = [1, 0];
                    }
                    this._player = maptalks__namespace.animation.Animation.animate(
                        { 'd' : dr },
                        { 'speed' : layer.options['animationDuration'], 'easing' : 'inAndOut' },
                        frame => {
                            if (frame.state.playState === 'finished') {
                                this._animated = false;
                                this.drawClusters(clusters, 1);
                                this.drawMarkers();
                                this.completeRender();
                            } else {
                                if (this._inout === 'in') {
                                    this.drawClustersFrame(clusters, parentClusters, frame.styles.d);
                                } else {
                                    this.drawClustersFrame(parentClusters, clusters, frame.styles.d);
                                }
                                this.setCanvasUpdated();
                            }
                        }
                    )
                    .play();
                } else {
                    this._animated = false;
                    this.drawClusters(clusters, 1);
                    this.drawMarkers();
                    this.completeRender();
                }
            }

            drawMarkers() {
                super.drawGeos();
            }

            drawClustersFrame(parentClusters, toClusters, ratio) {
                this._clusterMaskExtent = this.prepareCanvas();
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
                this._clusterMaskExtent = this.prepareCanvas();
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
                    ctx.drawImage(sprite.canvas, pos.x, pos.y);
                }

                if (this.layer.options['drawClusterText'] && cluster['textSize']) {
                    maptalks__namespace.Canvas.prepareCanvasFont(ctx, this._textSymbol);
                    ctx.textBaseline = 'middle';
                    const dx = this._textSymbol['textDx'] || 0;
                    const dy = this._textSymbol['textDy'] || 0;
                    const text = this._getClusterText(cluster);
                    maptalks__namespace.Canvas.fillText(ctx, text, pt.sub(cluster['textSize'].x, 0)._add(dx, dy));
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
                const key = maptalks__namespace.Util.getSymbolStamp(this._symbol);
                if (!this._spriteCache[key]) {
                    this._spriteCache[key] = new maptalks__namespace.Marker([0, 0], { 'symbol' : this._symbol })._getSprite(this.resources, this.getMap().CanvasClass);
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
                            'sum' : new maptalks__namespace.Coordinate(points[i].x, points[i].y),
                            'center' : new maptalks__namespace.Coordinate(points[i].x, points[i].y),
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

                        grids[key]['sum']._add(new maptalks__namespace.Coordinate(points[i].x, points[i].y));
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
                this._animated = true;
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
    };

    class ClusterLayerRenderer extends ClusterLayerRenderable(maptalks__namespace.renderer.VectorLayerCanvasRenderer) {

        constructor(...args) {
            super(...args);
            this.init();
        }
    }

    ClusterLayer.registerRenderer('canvas', ClusterLayerRenderer);

    if (typeof vt.PointLayerRenderer !== 'undefined') {
        class ClusterGLRenderer extends ClusterLayerRenderable(vt.PointLayerRenderer) {
            constructor(...args) {
                super(...args);
                this.init();
            }

            drawOnInteracting() {
                if (this._currentClusters) {
                    this.drawClusters(this._currentClusters, 1);
                }
                this.drawMarkers();
                this.completeRender();
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
                this.clearContext();
                this.pointCount = 0;
                this.bufferIndex = 0;
                this.opacityIndex = 0;
                if (!this.clusterSprites) {
                    this.clusterSprites = {};
                }
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
                const x = pos.x;
                const y = pos.y;
                const map = this.getMap();
                const pixelRatio = map.getDevicePixelRatio();
                const height = map.height;
                this.addPoint(x * pixelRatio, (height - y) * pixelRatio, sprite.data.width * pixelRatio, sprite.data.height * pixelRatio, opacity, key);
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
                let layerOpacity = this.layer && this.layer.options['opacity'];
                if (maptalks__namespace.Util.isNil(layerOpacity)) {
                    layerOpacity = 1;
                }
                this._renderer.render(this._spriteShader, { resolution: [width, height], layerOpacity }, this._scene, fbo);
            }

            _updateMesh() {
                const atlas = this._genAtlas();
                this._updateTexCoord(atlas);
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

                this.pointCount++;
            }

            addVertex(x, y, opacity) {
                if (this.positionBufferData[this.bufferIndex] !== x) {
                    this.positionBufferData[this.bufferIndex] = x;
                    this.positionBufferData.dirty = true;
                }
                this.bufferIndex++;
                if (this.positionBufferData[this.bufferIndex] !== y) {
                    this.positionBufferData[this.bufferIndex] = y;
                    this.positionBufferData.dirty = true;
                }
                this.bufferIndex++;

                opacity *= 255;
                U8[0] = opacity;
                if (this.opacityBufferData[this.opacityIndex] !== U8[0]) {
                    this.opacityBufferData[this.opacityIndex] = U8[0];
                    this.opacityBufferData.dirty = true;
                }
                this.opacityIndex++;
            }

            _check() {
                if (this.pointCount >= this.maxPointCount - 1) {
                    this.maxPointCount += 1024;
                    const { positionBufferData, texCoordBufferData, opacityBufferData } = this._initBuffers();
                    for (let i = 0; i < this.bufferIndex; i++) {
                        positionBufferData[i] = this.positionBufferData[i];
                        texCoordBufferData[i] = this.texCoordBufferData[i];
                    }
                    for (let i = 0; i < this.opacityIndex; i++) {
                        opacityBufferData[i] = this.opacityBufferData[i];
                    }
                    this.positionBufferData = positionBufferData;
                    this.texCoordBufferData = texCoordBufferData;
                    this.opacityBufferData = opacityBufferData;
                }
            }

            _updateGeometryData() {
                if (this.positionBufferData.dirty) {
                    this._clusterGeometry.updateData('aPosition', this.positionBufferData);
                    // console.log(this.positionBufferData);
                    this.positionBufferData.dirty = false;
                }
                if (this.opacityBufferData.dirty) {
                    this._clusterGeometry.updateData('aOpacity', this.opacityBufferData);
                    this.opacityBufferData.dirty = false;
                }
                if (this.texCoordBufferData.dirty) {
                    this._clusterGeometry.updateData('aTexCoord', this.texCoordBufferData);
                    this.texCoordBufferData.dirty = false;
                }
            }

            _updateTexCoord(atlas) {
                if (!this.sprites.dirty) {
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
                this._initTexture(image.data, width, height);
                this.sprites.dirty = false;
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
                this._clusterMesh.setUniform('spriteTexture', this._clusterTexture);
            }

            _fillTexCoord(tl, br, texWidth, texHeight) {
                const u1 = tl[0] / texWidth;
                const v1 = tl[1] / texHeight;
                const u2 = br[0] / texWidth;
                const v2 = br[1] / texHeight;

                this.addVertexTexCoord(u1, v1);
                this.addVertexTexCoord(u2, v1);
                this.addVertexTexCoord(u1, v2);
                this.addVertexTexCoord(u1, v2);
                this.addVertexTexCoord(u2, v1);
                this.addVertexTexCoord(u2, v2);
            }

            _genAtlas() {
                if (!this.textureDirty) {
                    return this.atlas;
                }
                const { IconAtlas, RGBAImage } = vt.getVectorPacker();
                const icons = this.clusterSprites;
                const iconMap = {};
                for (const url in icons) {
                    const icon = icons[url];
                    const { width, height, data } = icon.data;
                    const image = new RGBAImage({ width, height }, data);
                    iconMap[url] = { data: image, pixelRatio: 1 };
                }
                this.atlas = new IconAtlas(iconMap);
                this.textureDirty = false;
                return this.atlas;
            }

            addVertexTexCoord(u, v) {
                if (this.texCoordBufferData[this.texCoordIndex] !== u) {
                    this.texCoordBufferData[this.texCoordIndex] = u;
                    this.texCoordBufferData.dirty = true;
                }
                this.texCoordIndex++;
                if (this.texCoordBufferData[this.texCoordIndex] !== v) {
                    this.texCoordBufferData[this.texCoordIndex] = v;
                    this.texCoordBufferData.dirty = true;
                }
                this.texCoordIndex++;
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

                this._spriteShader = new gl.reshader.MeshShader({
                    vert,
                    frag,
                    extraCommandProps
                });
            }

            _initClusterMeshes() {
                this.maxPointCount = 1024;
                this.pointCount = 0;
                this.clusterSprites = {};
                this.sprites = [];

                const { positionBufferData, texCoordBufferData, opacityBufferData } = this._initBuffers();
                this.positionBufferData = positionBufferData;
                this.texCoordBufferData = texCoordBufferData;
                this.opacityBufferData = opacityBufferData;

                this._clusterGeometry = new gl.reshader.Geometry({
                    aPosition: this.positionBufferData,
                    aTexCoord: this.texCoordBufferData,
                    aOpacity: this.opacityBufferData
                }, null, 0, {
                    positionSize: 2
                });
                this._clusterGeometry.generateBuffers(this.device);
                this._clusterMesh = new gl.reshader.Mesh(this._clusterGeometry);
                this._scene = new gl.reshader.Scene([this._clusterMesh]);
                this._renderer = new gl.reshader.Renderer(this.device);
            }

            _initBuffers() {
                const vertexSize = 2;
                const texCoordSize = 2;
                const opacitySize = 1;

                const positionBufferData = new Float32Array(this.maxPointCount * vertexSize * 6);
                const texCoordBufferData = new Float32Array(this.maxPointCount * texCoordSize * 6);
                const opacityBufferData = new Uint8Array(this.maxPointCount * opacitySize * 6);
                opacityBufferData.fill(255);

                return { positionBufferData, texCoordBufferData, opacityBufferData };
            }
        }
        ClusterLayer.registerRenderer('gl', ClusterGLRenderer);
    }

    exports.ClusterLayer = ClusterLayer;

    Object.defineProperty(exports, '__esModule', { value: true });

    typeof console !== 'undefined' && console.log('maptalks.markercluster v0.8.8');

}));
//# sourceMappingURL=maptalks.markercluster.js.map
