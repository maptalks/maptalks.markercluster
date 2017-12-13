import * as maptalks from 'maptalks';

const options = {
    'maxClusterRadius' : 160,
    'symbol' : null,
    'drawClusterText' : true,
    'textSymbol' : null,
    'animation' : true,
    'animationDuration' : 450,
    'maxClusterZoom' : null,
    'noClusterWithOneMarker':true,
    'forceRenderOnZooming' : true,
    'interact':true
};

export class ClusterLayer extends maptalks.VectorLayer {
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
        for (let i = 0, len = markers.length; i <= len; i++) {
            if (!markers[i] instanceof maptalks.Marker) {
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

ClusterLayer.registerRenderer('canvas', class extends maptalks.renderer.VectorLayerCanvasRenderer {

    constructor(layer) {
        super(layer);
        this._animated = true;
        this._refreshStyle();
        this._clusterNeedRedraw = true;
        //
        if (this.layer.options['interact']) {
            const map = this.layer.getMap();
            const _id = `${maptalks.INTERNAL_LAYER_PREFIX}_markercluster_spreadoutLayer`;
            this._spreadoutLayer = (!this._spreadoutLayer) ? new maptalks.VectorLayer(_id).addTo(map) : this._spreadoutLayer;
            map.on('click', function (e) {
                this._spreadoutLayer.clear();
                const result = this.identify(e.coordinate);
                const center = result.center;
                if (!result.children) return;
                const len = result.children.length;
                for (let i = 0; i < len; i++) {
                    const to = this._calculateTo(center, i, len);
                    this._createline(center, to, result.children[i]);
                }
            }, this);
            map.on('zoomend', function () {
                if (this._spreadoutLayer) {
                    this._spreadoutLayer.clear();
                }
            }, this);
        }
    }

    checkResources() {
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
            this._markersToDraw = this.layer._geoList;
            super.draw.apply(this, arguments);
            return;
        }
        if (this._clusterNeedRedraw) {
            this._clearDataCache();
            this._computeGrid();
            this._clusterNeedRedraw = false;
        }
        const zoomClusters = this._clusterCache[zoom] ? this._clusterCache[zoom]['clusters'] : null;

        const clusters = this._getClustersToDraw(zoomClusters);
        clusters.zoom = zoom;
        this._drawLayer(clusters);
    }

    _getClustersToDraw(zoomClusters) {
        this._markersToDraw = [];
        const map = this.getMap();
        const font = maptalks.StringUtil.getFont(this._textSymbol),
            digitLen = maptalks.StringUtil.stringLength('9', font).toPoint();
        const extent = map.getContainerExtent(),
            clusters = [];
        let pt, pExt, sprite, width, height;
        for (const p in zoomClusters) {
            this._currentGrid = zoomClusters[p];
            if (zoomClusters[p]['count'] === 1 && this.layer.options['noClusterWithOneMarker']) {
                const marker = zoomClusters[p]['children'][0];
                marker._cluster = zoomClusters[p];
                this._markersToDraw.push(marker);
                continue;
            }
            sprite = this._getSprite();
            width = sprite.canvas.width;
            height = sprite.canvas.height;
            pt = map._prjToContainerPoint(zoomClusters[p]['center']);
            pExt = new maptalks.PointExtent(pt.sub(width, height), pt.add(width, height));
            if (!extent.intersects(pExt)) {
                continue;
            }

            if (!zoomClusters[p]['textSize']) {
                zoomClusters[p]['textSize'] = new maptalks.Point(digitLen.x * (zoomClusters[p]['count'] + '').length, digitLen.y)._multi(1 / 2);
            }
            clusters.push(zoomClusters[p]);
        }
        return clusters;
    }

    drawOnInteracting() {
        if (this._currentClusters) {
            this._drawClusters(this._currentClusters, 1);
        }
        super.drawOnInteracting.apply(this, arguments);
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
                const markerWidth = this._getSprite().canvas.width;

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
        if (this._markersToDraw) {
            return this.layer._hitGeos(this._markersToDraw, coordinate, options);
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
        const parentClusters = this._currentClusters;
        this._currentClusters = clusters;
        delete this._clusterMaskExtent;
        const layer = this.layer;
        //if (layer.options['animation'] && this._animated && this._inout === 'out') {
        if (layer.options['animation'] && this._animated && this._inout) {
            let dr = [0, 1];
            if (this._inout === 'in') {
                dr = [1, 0];
            }
            this._player = maptalks.animation.Animation.animate(
                { 'd' : dr },
                { 'speed' : layer.options['animationDuration'], 'easing' : 'inAndOut' },
                frame => {
                    if (frame.state.playState === 'finished') {
                        this._animated = false;
                        this._drawClusters(clusters, 1);
                        this._drawMarkers();
                        this.completeRender();
                    } else {
                        if (this._inout === 'in') {
                            this._drawClustersFrame(clusters, parentClusters, frame.styles.d);
                        } else {
                            this._drawClustersFrame(parentClusters, clusters, frame.styles.d);
                        }
                        this.setCanvasUpdated();
                    }
                }
            )
            .play();
        } else {
            this._animated = false;
            this._drawClusters(clusters, 1);
            this._drawMarkers();
            this.completeRender();
        }
    }

    _drawMarkers() {
        super.drawGeos(this._clusterMaskExtent);
    }

    _calculateTo(center, index, count) {
        const map = this.layer.getMap();
        let d = 60;
        let angle = 0;
        if (count <= 10) {
            d = 60;
            angle = (360 / count) * 2 * index;
        } else {
            d = 60 + index * 5;
            angle = 32 * 2 * index;
        }
        const _center = map.coordinateToContainerPoint(center);
        const x = _center.x + d * Math.cos(angle * Math.PI / 360);
        const y = _center.y - d * Math.sin(angle * Math.PI / 360);
        const to = map.containerPointToCoordinate(new maptalks.Point(x, y));
        return to;
    }

    _createline(from, to, marker) {
        let sprite = null, line = null;
        let vx = 0, vy = 0;
        let ax = 0, ay = 0;
        let dx = null, dy = null;
        const targetX = to.x, targetY = to.y;
        const spring = 0.2, f = 0.8;
        let spriteXY = null;
        const markerFile = this.layer.options['markerFile'];
        const layer = this._spreadoutLayer;
        let animId = null;
        function play() {
            if (!line) {
                line = new maptalks.LineString([from, from], {
                    symbol: [{
                        'lineWidth': 1,
                        'lineColor': 'rgba(36,138,74,1)',
                        'lineCap': 'round'
                    }]
                }).addTo(layer);
                let opt = markerFile ? {
                    symbol: {
                        'markerFile': markerFile
                    },
                    properties: marker.getProperties()
                } : {
                    properties: marker.getProperties()
                };
                sprite = new maptalks.Marker(from, opt).addTo(layer);
            } else {
                spriteXY = sprite.getCenter();
                dx = targetX - spriteXY.x;
                ax = dx * spring;
                vx += ax;
                vx *= f;
                spriteXY.x += vx;
                dy = targetY - spriteXY.y;
                ay = dy * spring;
                vy += ay;
                vy *= f;
                spriteXY.y += vy;
                sprite.setCoordinates(spriteXY);
                line.setCoordinates([from, spriteXY]);
            }
            if (spriteXY && spriteXY.x === to.x && spriteXY.y === to.y && animId) {
                cancelAnimationFrame(animId);
            } else {
                animId = requestAnimationFrame(play);
            }
        }
        play();
    }

    _drawClustersFrame(parentClusters, toClusters, ratio) {
        this._clusterMaskExtent = this.prepareCanvas();
        const map = this.getMap(),
            drawn = {};
        if (parentClusters) {
            parentClusters.forEach(c => {
                const p = map._prjToContainerPoint(c['center']);
                if (!drawn[c.key]) {
                    drawn[c.key] = 1;
                    this._drawCluster(p, c, 1 - ratio);
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
            const parent = this._clusterCache[z]['clusterMap'][pkey];
            if (parent) {
                const pp = map._prjToContainerPoint(parent['center']);
                pt = pp.add(pt.sub(pp)._multi(ratio));
            }
            this._drawCluster(pt, c, ratio > 0.5 ? 1 : ratio);
        });
    }

    _drawClusters(clusters, ratio) {
        if (!clusters) {
            return;
        }
        this._clusterMaskExtent = this.prepareCanvas();
        const map = this.getMap();
        clusters.forEach(c => {
            const pt = map._prjToContainerPoint(c['center']);
            this._drawCluster(pt, c, ratio > 0.5 ? 1 : ratio);
        });

    }

    _drawCluster(pt, grid, op) {
        this._currentGrid = grid;
        const ctx = this.context;
        const sprite = this._getSprite();
        const opacity = ctx.globalAlpha;
        if (opacity * op === 0) {
            return;
        }
        ctx.globalAlpha = opacity * op;
        if (sprite) {
            const pos = pt.add(sprite.offset)._sub(sprite.canvas.width / 2, sprite.canvas.height / 2);
            ctx.drawImage(sprite.canvas, pos.x, pos.y);
        }

        if (this.layer.options['drawClusterText'] && grid['textSize']) {
            maptalks.Canvas.prepareCanvasFont(ctx, this._textSymbol);
            const dx = this._textSymbol['textDx'] || 0;
            const dy = this._textSymbol['textDy'] || 0;
            maptalks.Canvas.fillText(ctx, grid['count'], pt.sub(grid['textSize']).add(dx, dy));
        }
        ctx.globalAlpha = opacity;
    }


    _getSprite() {
        if (!this._spriteCache) {
            this._spriteCache = {};
        }
        const key = maptalks.Util.getSymbolStamp(this._symbol);
        if (!this._spriteCache[key]) {
            this._spriteCache[key] = new maptalks.Marker([0, 0], { 'symbol' : this._symbol })._getSprite(this.resources, this.getMap().CanvasClass);
        }
        return this._spriteCache[key];
    }

    _initGridSystem() {
        const points = [];
        let extent, c;
        this.layer.forEach(g => {
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
        const grids = {},
            min = this._markerExtent.getMin();
        let gx, gy, key,
            pgx, pgy, pkey;
        for (let i = 0, len = points.length; i < len; i++) {
            gx = Math.floor((points[i].x - min.x) / r);
            gy = Math.floor((points[i].y - min.y) / r);
            key = gx + '_' + gy;
            if (!grids[key]) {
                grids[key] = {
                    'sum' : new maptalks.Coordinate(points[i].x, points[i].y),
                    'center' : new maptalks.Coordinate(points[i].x, points[i].y),
                    'count' : 1,
                    'children' :[points[i].geometry],
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
                grids[key]['children'].push(points[i].geometry);
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
                    grid['children'].concat(toMerge[i].geometry);
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
});
