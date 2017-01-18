/*!
 * maptalks.clusterlayer v2.0.0
 * LICENSE : MIT
 * (c) 2016-2017 maptalks.org
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('maptalks')) :
	typeof define === 'function' && define.amd ? define(['exports', 'maptalks'], factory) :
	(factory((global.maptalks = global.maptalks || {}),global.maptalks));
}(this, (function (exports,maptalks) { 'use strict';

function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass); }

var options = {
    'maxClusterRadius': 160,
    'geometryEvents': false,
    'symbol': null,
    'markerSymbol': null,
    'drawClusterText': true,
    'textSymbol': null,
    'animation': true,
    'animationDuration': 450,
    'maxClusterZoom': null
};

var ClusterLayer = function (_maptalks$VectorLayer) {
    _inherits(ClusterLayer, _maptalks$VectorLayer);

    function ClusterLayer() {
        _classCallCheck(this, ClusterLayer);

        return _possibleConstructorReturn(this, _maptalks$VectorLayer.apply(this, arguments));
    }

    /**
     * Reproduce a ClusterLayer from layer's profile JSON.
     * @param  {Object} json - layer's profile JSON
     * @return {maptalks.ClusterLayer}
     * @static
     * @private
     * @function
     */
    ClusterLayer.fromJSON = function fromJSON(json) {
        if (!json || json['type'] !== 'ClusterLayer') {
            return null;
        }
        var layer = new ClusterLayer(json['id'], json['options']);
        var geoJSONs = json['geometries'];
        var geometries = [];
        for (var i = 0; i < geoJSONs.length; i++) {
            var geo = maptalks.Geometry.fromJSON(geoJSONs[i]);
            if (geo) {
                geometries.push(geo);
            }
        }
        layer.addGeometry(geometries);
        return layer;
    };

    ClusterLayer.prototype.onConfig = function onConfig(conf) {
        if (conf.hasOwnProperty('symbol')) {
            if (this._getRenderer()) {
                this._getRenderer().onSymbolChanged();
            }
        }
        return _maptalks$VectorLayer.prototype.onConfig.call(this, conf);
    };

    ClusterLayer.prototype.addMarker = function addMarker(markers) {
        return this.addGeometry(markers);
    };

    ClusterLayer.prototype.addGeometry = function addGeometry(markers) {
        for (var i = 0, len = markers.length; i <= len; i++) {
            if (!markers[i] instanceof maptalks.Marker) {
                throw new Error('Only a point(Marker) can be added into a ClusterLayer');
            }
        }
        return _maptalks$VectorLayer.prototype.addGeometry.apply(this, arguments);
    };

    /**
     * Identify the clusters on the given container point
     * @param  {maptalks.Point} point   - 2d point
     * @return {Object}  result: { center : [cluster's center], children : [geometries in the cluster] }
     */


    ClusterLayer.prototype.identify = function identify(point, options) {
        if (this._getRenderer()) {
            return this._getRenderer().identify(point, options);
        }
        return null;
    };

    /**
     * Export the ClusterLayer's JSON.
     * @return {Object} layer's JSON
     */


    ClusterLayer.prototype.toJSON = function toJSON() {
        var json = _maptalks$VectorLayer.prototype.toJSON.call(this);
        json['type'] = 'ClusterLayer';
        return json;
    };

    return ClusterLayer;
}(maptalks.VectorLayer);

// merge to define ClusterLayer's default options.
ClusterLayer.mergeOptions(options);

// register ClusterLayer's JSON type for JSON deserialization.
ClusterLayer.registerJSONType('ClusterLayaer');

var defaultTextSymbol = {
    'textFaceName': '"microsoft yahei"',
    'textSize': 16
};

var defaultSymbol = {
    'markerType': 'ellipse',
    'markerFill': { property: 'count', type: 'interval', stops: [[0, 'rgb(135, 196, 240)'], [9, '#1bbc9b'], [99, 'rgb(216, 115, 149)']] },
    'markerFillOpacity': 0.7,
    'markerLineOpacity': 1,
    'markerLineWidth': 3,
    'markerLineColor': '#fff',
    'markerWidth': { property: 'count', type: 'interval', stops: [[0, 40], [9, 60], [99, 80]] },
    'markerHeight': { property: 'count', type: 'interval', stops: [[0, 40], [9, 60], [99, 80]] }
};

ClusterLayer.registerRenderer('canvas', function (_maptalks$renderer$Ov) {
    _inherits(_class, _maptalks$renderer$Ov);

    function _class(layer) {
        _classCallCheck(this, _class);

        var _this2 = _possibleConstructorReturn(this, _maptalks$renderer$Ov.call(this, layer));

        var id = maptalks.INTERNAL_LAYER_PREFIX + '_cluster_' + maptalks.Util.GUID();
        _this2._markerLayer = new maptalks.VectorLayer(id).addTo(layer.getMap());
        var allId = maptalks.INTERNAL_LAYER_PREFIX + '_cluster_all_' + maptalks.Util.GUID();
        _this2._allMarkerLayer = new maptalks.VectorLayer(allId, { 'visible': false }).addTo(layer.getMap());
        _this2._animated = true;
        _this2._refreshStyle();
        _this2._needRedraw = true;
        return _this2;
    }

    _class.prototype.checkResources = function checkResources() {
        var resources = _maptalks$renderer$Ov.prototype.checkResources.apply(this, arguments);
        var res = maptalks.Util.getExternalResources(this.layer.options['symbol'] || defaultSymbol, true);
        if (res) {
            resources.push.apply(resources, res);
        }
        return resources;
    };

    _class.prototype.draw = function draw() {
        if (!this.canvas) {
            this.prepareCanvas();
        }
        var map = this.getMap();
        var zoom = map.getZoom();
        var markerSymbol = this.layer.options['markerSymbol'];
        var maxClusterZoom = this.layer.options['maxClusterZoom'];
        if (maxClusterZoom && zoom > maxClusterZoom) {
            this.prepareCanvas();
            delete this._currentClusters;
            this._markerLayer.clear();
            if (this._allMarkerLayer.getCount() !== this.layer.getCount()) {
                this._allMarkerLayer.clear();
                var copyMarkers = [];
                this.layer.forEach(function (g) {
                    copyMarkers.push(g.copy().setSymbol(markerSymbol).copyEventListeners(g));
                });
                this._allMarkerLayer.addGeometry(copyMarkers);
            }
            this._allMarkerLayer.show();
            this._completeAndFire();
            return;
        }
        this._allMarkerLayer.hide();
        if (this._needRedraw) {
            this._clearDataCache();
            this._computeGrid();
            this._needRedraw = false;
        }
        var zoomClusters = this._clusterCache[zoom] ? this._clusterCache[zoom]['clusters'] : null;
        var extent = map.getContainerExtent(),
            marker,
            markers = [],
            clusters = [],
            pt,
            pExt,
            sprite,
            width,
            height,
            font;
        for (var p in zoomClusters) {
            this._currentGrid = zoomClusters[p];
            if (zoomClusters[p]['count'] === 1) {
                marker = zoomClusters[p]['children'][0].copy().setSymbol(markerSymbol).copyEventListeners(zoomClusters[p]['children'][0]);
                marker._cluster = zoomClusters[p];
                markers.push(marker);
                continue;
            }
            sprite = this._getSprite();
            width = sprite.canvas.width;
            height = sprite.canvas.height;
            pt = map._prjToContainerPoint(zoomClusters[p]['center']);
            pExt = new maptalks.PointExtent(pt.substract(width, height), pt.add(width, height));
            if (!extent.intersects(pExt)) {
                continue;
            }
            font = maptalks.Util.getFont(this._textSymbol);
            if (!zoomClusters[p]['textSize']) {
                zoomClusters[p]['textSize'] = maptalks.Util.stringLength(zoomClusters[p]['count'], font).toPoint()._multi(1 / 2);
            }
            clusters.push(zoomClusters[p]);
        }
        this._drawLayer(clusters, markers);
    };

    _class.prototype.drawOnZooming = function drawOnZooming() {
        if (this._currentClusters) {
            this._drawClusters(this._currentClusters, 1);
        }
    };

    _class.prototype.onGeometryAdd = function onGeometryAdd() {
        this._needRedraw = true;
        this.render();
    };

    _class.prototype.onGeometryRemove = function onGeometryRemove() {
        this._needRedraw = true;
        this.render();
    };

    _class.prototype.onGeometryPositionChange = function onGeometryPositionChange() {
        this._needRedraw = true;
        this.render();
    };

    _class.prototype.onRemove = function onRemove() {
        this._clearDataCache();
        this._markerLayer.remove();
        this._allMarkerLayer.remove();
    };

    _class.prototype.show = function show() {
        this._markerLayer.show();
        this._allMarkerLayer.show();
        maptalks.renderer.CanvasRenderer.prototype.show.call(this);
    };

    _class.prototype.hide = function hide() {
        this._markerLayer.hide();
        this._allMarkerLayer.hide();
        maptalks.renderer.CanvasRenderer.prototype.hide.call(this);
    };

    _class.prototype.setZIndex = function setZIndex(z) {
        this._markerLayer.setZIndex(z);
        this._allMarkerLayer.setZIndex(z);
        maptalks.renderer.CanvasRenderer.prototype.setZIndex.call(this, z);
    };

    _class.prototype.transform = function transform(matrix) {
        if (this._currentClusters) {
            this._drawClusters(this._currentClusters, 1, matrix);
        }
        return true;
    };

    _class.prototype.identify = function identify(point) {
        var map = this.getMap();
        point = map._pointToContainerPoint(point);
        if (!this._currentClusters) {
            return null;
        }
        var old = this._currentGrid;
        for (var i = 0; i < this._currentClusters.length; i++) {
            var c = this._currentClusters[i];
            var pt = map._prjToContainerPoint(c['center']);
            this._currentGrid = c;
            var markerWidth = this._getSprite().canvas.width;

            if (point.distanceTo(pt) <= markerWidth) {
                return {
                    'center': map.getProjection().unproject(c.center.copy()),
                    'children': c.children.slice(0)
                };
            }
        }
        this._currentGrid = old;
        return null;
    };

    _class.prototype.onSymbolChanged = function onSymbolChanged() {
        this._refreshStyle();
        this._computeGrid();
        this._stopAnim();
        this.draw();
    };

    _class.prototype.isUpdateWhenZooming = function isUpdateWhenZooming() {
        return true;
    };

    _class.prototype._refreshStyle = function _refreshStyle() {
        var _this3 = this;

        var symbol = this.layer.options['symbol'] || defaultSymbol;
        var textSymbol = this.layer.options['textSymbol'] || defaultTextSymbol;
        // var symbolizer = maptalks.symbolizer.VectorMarkerSymbolizer;
        // var style = symbolizer.translateLineAndFill(symbol);
        var argFn = function argFn() {
            return [_this3.getMap().getZoom(), _this3._currentGrid];
        };
        // this._style = maptalks.MapboxUtil.loadFunctionTypes(style, argFn);
        this._symbol = maptalks.MapboxUtil.loadFunctionTypes(symbol, argFn);
        this._textSymbol = maptalks.MapboxUtil.loadFunctionTypes(textSymbol, argFn);
    };

    _class.prototype._drawLayer = function _drawLayer(clusters, markers, matrix) {
        var _this4 = this;

        this._currentClusters = clusters;
        var layer = this.layer;
        if (layer.options['animation'] && this._animated && this._inout === 'out') {
            this._player = maptalks.animation.Animation.animate({ 'd': [0, 1] }, { 'speed': layer.options['animationDuration'], 'easing': 'inAndOut' }, function (frame) {
                if (frame.state.playState === 'finished') {
                    if (_this4._markerLayer.getCount() > 0) {
                        _this4._markerLayer.clear();
                    }
                    _this4._markerLayer.addGeometry(markers);
                    _this4._animated = false;
                    _this4._completeAndFire();
                } else {
                    _this4._drawClusters(clusters, frame.styles.d, matrix);
                    _this4.requestMapToRender();
                }
            }).play();
            this._drawClusters(clusters, 0, matrix);
            this.requestMapToRender();
        } else {
            this._drawClusters(clusters, 1, matrix);
            if (!matrix && (this._animated || this._markerLayer.getCount() === 0)) {
                if (this._markerLayer.getCount() > 0) {
                    this._markerLayer.clear();
                }
                this._markerLayer.addGeometry(markers);
            }
            this._animated = false;
            this._completeAndFire();
        }
    };

    _class.prototype._drawClusters = function _drawClusters(clusters, ratio, matrix) {
        var _this5 = this;

        matrix = matrix ? matrix['container'] : null;
        this.prepareCanvas();
        var map = this.getMap(),
            drawn = {};
        clusters.forEach(function (c) {
            if (c.parent) {
                var parent = map._prjToContainerPoint(c.parent['center']);
                if (!drawn[c.parent.key]) {
                    if (matrix) {
                        parent = matrix.applyToPointInstance(parent);
                    }
                    drawn[c.parent.key] = 1;
                    _this5._drawCluster(parent, c.parent, 1 - ratio);
                }
            }
        });
        if (ratio === 0) {
            return;
        }
        clusters.forEach(function (c) {
            var pt = map._prjToContainerPoint(c['center']);
            if (c.parent) {
                var parent = map._prjToContainerPoint(c.parent['center']);
                pt = parent.add(pt.substract(parent)._multi(ratio));
            }
            if (matrix) {
                pt = matrix.applyToPointInstance(pt);
            }
            _this5._drawCluster(pt, c, ratio > 0.5 ? 1 : ratio);
        });
    };

    _class.prototype._drawCluster = function _drawCluster(pt, grid, op) {
        this._currentGrid = grid;
        var ctx = this.context;
        var sprite = this._getSprite();
        var opacity = ctx.globalAlpha;
        if (opacity * op === 0) {
            return;
        }
        ctx.globalAlpha = opacity * op;
        if (sprite) {
            var pos = pt.add(sprite.offset)._substract(sprite.canvas.width / 2, sprite.canvas.height / 2);
            ctx.drawImage(sprite.canvas, pos.x, pos.y);
        }

        if (this.layer.options['drawClusterText'] && grid['textSize']) {
            maptalks.Canvas.prepareCanvasFont(ctx, this._textSymbol);
            maptalks.Canvas.fillText(ctx, grid['count'], pt.substract(grid['textSize']));
        }
        ctx.globalAlpha = opacity;
    };

    _class.prototype._completeAndFire = function _completeAndFire() {
        var _this6 = this;

        var zoom = this.getMap().getZoom();
        var maxClusterZoom = this.layer.options['maxClusterZoom'];
        if (maxClusterZoom && zoom > maxClusterZoom) {
            if (this._allMarkerLayer && this._allMarkerLayer.getCount() > 0 && !this._allMarkerLayer.isLoaded()) {
                this._allMarkerLayer.once('layerload', function () {
                    _this6.completeRender();
                });
            } else {
                this.completeRender();
            }
        } else if (this._markerLayer && this._markerLayer.getCount() > 0 && !this._markerLayer.isLoaded()) {
            this._markerLayer.once('layerload', function () {
                _this6.completeRender();
            });
        } else {
            this.completeRender();
        }
    };

    _class.prototype._getSprite = function _getSprite() {
        if (!this._spriteCache) {
            this._spriteCache = {};
        }
        var key = maptalks.Util.getSymbolStamp(this._symbol);
        if (!this._spriteCache[key]) {
            this._spriteCache[key] = new maptalks.Marker([0, 0], { 'symbol': this._symbol })._getSprite(this.resources);
        }
        return this._spriteCache[key];
    };

    _class.prototype._initGridSystem = function _initGridSystem() {
        var extent,
            points = [];
        var c;
        this.layer.forEach(function (g) {
            c = g._getPrjCoordinates();
            if (!extent) {
                extent = g._getPrjExtent();
            } else {
                extent = extent._combine(g._getPrjExtent());
            }
            points.push({
                x: c.x,
                y: c.y,
                id: g._getInternalId(),
                geometry: g
            });
        });
        this._markerExtent = extent;
        this._markerPoints = points;
    };

    _class.prototype._computeGrid = function _computeGrid() {
        var map = this.getMap(),
            zoom = map.getZoom();
        if (!this._markerExtent) {
            this._initGridSystem();
        }
        if (!this._clusterCache) {
            this._clusterCache = {};
        }
        var pre = map._getResolution(map.getMinZoom()) > map._getResolution(map.getMaxZoom()) ? zoom - 1 : zoom + 1;
        if (this._clusterCache[pre] && this._clusterCache[pre].length === this.layer.getCount()) {
            this._clusterCache[zoom] = this._clusterCache[pre];
        }
        if (!this._clusterCache[zoom]) {
            this._clusterCache[zoom] = this._computeZoomGrid(zoom);
        }
    };

    _class.prototype._computeZoomGrid = function _computeZoomGrid(zoom) {
        if (!this._markerExtent) {
            return null;
        }
        var map = this.getMap(),
            r = map._getResolution(zoom) * this.layer.options['maxClusterRadius'],
            preCache = this._clusterCache[zoom - 1],
            preT = map._getResolution(zoom - 1) ? map._getResolution(zoom - 1) * this.layer.options['maxClusterRadius'] : null;
        if (!preCache && zoom - 1 >= map.getMinZoom()) {
            this._clusterCache[zoom - 1] = preCache = this._computeZoomGrid(zoom - 1);
        }
        // 1. format extent of markers to grids with raidus of r
        // 2. find point's grid in the grids
        // 3. sum up the point into the grid's collection
        var points = this._markerPoints;
        var grids = {},
            min = this._markerExtent.getMin(),
            gx,
            gy,
            key,
            pgx,
            pgy,
            pkey;
        for (var i = 0, len = points.length; i < len; i++) {
            gx = Math.floor((points[i].x - min.x) / r);
            gy = Math.floor((points[i].y - min.y) / r);
            key = gx + '_' + gy;
            if (!grids[key]) {
                grids[key] = {
                    'sum': new maptalks.Coordinate(points[i].x, points[i].y),
                    'center': new maptalks.Coordinate(points[i].x, points[i].y),
                    'count': 1,
                    'children': [points[i].geometry],
                    'key': key + ''
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
        // return {
        //     'clusters' : grids,
        //     'clusterMap' : grids
        // };
        return this._mergeClusters(grids, r / 2);
    };

    _class.prototype._mergeClusters = function _mergeClusters(grids, r) {
        var clusterMap = {};
        var p;
        for (p in grids) {
            clusterMap[p] = grids[p];
        }

        // merge adjacent clusters
        var merging = {};

        var visited = {};
        // find clusters need to merge
        var c1, c2;
        for (p in grids) {
            c1 = grids[p];
            if (visited[c1.key]) {
                continue;
            }
            var gxgy = c1.key.split('_');
            var gx = +gxgy[0],
                gy = +gxgy[1];
            //traverse adjacent grids
            for (var ii = -1; ii <= 1; ii++) {
                for (var iii = -1; iii <= 1; iii++) {
                    if (ii === 0 && iii === 0) {
                        continue;
                    }
                    var key2 = gx + ii + '_' + (gy + iii);
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
        for (var m in merging) {
            var grid = grids[m];
            if (!grid) {
                continue;
            }
            var toMerge = merging[m];
            for (var i = 0; i < toMerge.length; i++) {
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
            'clusters': grids,
            'clusterMap': clusterMap
        };
    };

    _class.prototype._distanceTo = function _distanceTo(c1, c2) {
        var x = c1.x - c2.x,
            y = c1.y - c2.y;
        return Math.sqrt(x * x + y * y);
    };

    _class.prototype._stopAnim = function _stopAnim() {
        if (this._player && this._player.playState !== 'finished') {
            this._player.cancel();
        }
    };

    _class.prototype.onZoomStart = function onZoomStart(param) {
        this._inout = param['from'] > param['to'] ? 'in' : 'out';
        var maxClusterZoom = this.layer.options['maxClusterZoom'];
        if (maxClusterZoom && param['to'] <= maxClusterZoom) {
            this._allMarkerLayer.hide();
        }
        // if (this._markerLayer.getCount() > 0) {
        //     this._markerLayer.clear();
        // }
        this._stopAnim();
    };

    _class.prototype.onZoomEnd = function onZoomEnd() {
        this._animated = true;
        // if (this._markerLayer.getCount() > 0) {

        // }
        this._computeGrid();
        maptalks.renderer.CanvasRenderer.prototype.onZoomEnd.apply(this, arguments);
    };

    _class.prototype._clearDataCache = function _clearDataCache() {
        this._stopAnim();
        this._markerLayer.clear();
        delete this._markerExtent;
        delete this._markerPoints;
        delete this._clusterCache;
    };

    return _class;
}(maptalks.renderer.OverlayLayerCanvasRenderer));

exports.ClusterLayer = ClusterLayer;

Object.defineProperty(exports, '__esModule', { value: true });

})));
