/*!
 * maptalks.clusterlayer v2.0.0
 * (c) 2016 maptalks.org
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

// function getGradient(color) {
//     return 'rgba(' + color.join() + ', 1)';
//     return {
//         type : 'radial',
//         colorStops : [
//             [0.00, 'rgba(' + color.join() + ', 0)'],
//             [0.50, 'rgba(' + color.join() + ', 1)'],
//             [1.00, 'rgba(' + color.join() + ', 1)']
//         ]
//     };
// }

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
                    _this4.completeRender();
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
            this.completeRender();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwdGFsa3MuY2x1c3RlcmxheWVyLmpzIiwic291cmNlcyI6WyIuLi9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBtYXB0YWxrcyBmcm9tICdtYXB0YWxrcyc7XG5cbmNvbnN0IG9wdGlvbnMgPSB7XG4gICAgJ21heENsdXN0ZXJSYWRpdXMnIDogMTYwLFxuICAgICdnZW9tZXRyeUV2ZW50cycgOiBmYWxzZSxcbiAgICAnc3ltYm9sJyA6IG51bGwsXG4gICAgJ21hcmtlclN5bWJvbCcgOiBudWxsLFxuICAgICdkcmF3Q2x1c3RlclRleHQnIDogdHJ1ZSxcbiAgICAndGV4dFN5bWJvbCcgOiBudWxsLFxuICAgICdhbmltYXRpb24nIDogdHJ1ZSxcbiAgICAnYW5pbWF0aW9uRHVyYXRpb24nIDogNDUwLFxuICAgICdtYXhDbHVzdGVyWm9vbScgOiBudWxsXG59O1xuXG5leHBvcnQgY2xhc3MgQ2x1c3RlckxheWVyIGV4dGVuZHMgbWFwdGFsa3MuVmVjdG9yTGF5ZXIge1xuICAgIC8qKlxuICAgICAqIFJlcHJvZHVjZSBhIENsdXN0ZXJMYXllciBmcm9tIGxheWVyJ3MgcHJvZmlsZSBKU09OLlxuICAgICAqIEBwYXJhbSAge09iamVjdH0ganNvbiAtIGxheWVyJ3MgcHJvZmlsZSBKU09OXG4gICAgICogQHJldHVybiB7bWFwdGFsa3MuQ2x1c3RlckxheWVyfVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBmdW5jdGlvblxuICAgICAqL1xuICAgIHN0YXRpYyBmcm9tSlNPTihqc29uKSB7XG4gICAgICAgIGlmICghanNvbiB8fCBqc29uWyd0eXBlJ10gIT09ICdDbHVzdGVyTGF5ZXInKSB7IHJldHVybiBudWxsOyB9XG4gICAgICAgIGNvbnN0IGxheWVyID0gbmV3IENsdXN0ZXJMYXllcihqc29uWydpZCddLCBqc29uWydvcHRpb25zJ10pO1xuICAgICAgICBjb25zdCBnZW9KU09OcyA9IGpzb25bJ2dlb21ldHJpZXMnXTtcbiAgICAgICAgY29uc3QgZ2VvbWV0cmllcyA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGdlb0pTT05zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgZ2VvID0gbWFwdGFsa3MuR2VvbWV0cnkuZnJvbUpTT04oZ2VvSlNPTnNbaV0pO1xuICAgICAgICAgICAgaWYgKGdlbykge1xuICAgICAgICAgICAgICAgIGdlb21ldHJpZXMucHVzaChnZW8pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxheWVyLmFkZEdlb21ldHJ5KGdlb21ldHJpZXMpO1xuICAgICAgICByZXR1cm4gbGF5ZXI7XG4gICAgfVxuXG4gICAgb25Db25maWcoY29uZikge1xuICAgICAgICBpZiAoY29uZi5oYXNPd25Qcm9wZXJ0eSgnc3ltYm9sJykpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9nZXRSZW5kZXJlcigpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZ2V0UmVuZGVyZXIoKS5vblN5bWJvbENoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIub25Db25maWcoY29uZik7XG4gICAgfVxuXG4gICAgYWRkTWFya2VyKG1hcmtlcnMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkR2VvbWV0cnkobWFya2Vycyk7XG4gICAgfVxuXG4gICAgYWRkR2VvbWV0cnkobWFya2Vycykge1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gbWFya2Vycy5sZW5ndGg7IGkgPD0gbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGlmICghbWFya2Vyc1tpXSBpbnN0YW5jZW9mIG1hcHRhbGtzLk1hcmtlcikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignT25seSBhIHBvaW50KE1hcmtlcikgY2FuIGJlIGFkZGVkIGludG8gYSBDbHVzdGVyTGF5ZXInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VwZXIuYWRkR2VvbWV0cnkuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJZGVudGlmeSB0aGUgY2x1c3RlcnMgb24gdGhlIGdpdmVuIGNvbnRhaW5lciBwb2ludFxuICAgICAqIEBwYXJhbSAge21hcHRhbGtzLlBvaW50fSBwb2ludCAgIC0gMmQgcG9pbnRcbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9ICByZXN1bHQ6IHsgY2VudGVyIDogW2NsdXN0ZXIncyBjZW50ZXJdLCBjaGlsZHJlbiA6IFtnZW9tZXRyaWVzIGluIHRoZSBjbHVzdGVyXSB9XG4gICAgICovXG4gICAgaWRlbnRpZnkocG9pbnQsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKHRoaXMuX2dldFJlbmRlcmVyKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nZXRSZW5kZXJlcigpLmlkZW50aWZ5KHBvaW50LCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeHBvcnQgdGhlIENsdXN0ZXJMYXllcidzIEpTT04uXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBsYXllcidzIEpTT05cbiAgICAgKi9cbiAgICB0b0pTT04oKSB7XG4gICAgICAgIGNvbnN0IGpzb24gPSBzdXBlci50b0pTT04uY2FsbCh0aGlzKTtcbiAgICAgICAganNvblsndHlwZSddID0gJ0NsdXN0ZXJMYXllcic7XG4gICAgICAgIHJldHVybiBqc29uO1xuICAgIH1cbn1cblxuLy8gbWVyZ2UgdG8gZGVmaW5lIENsdXN0ZXJMYXllcidzIGRlZmF1bHQgb3B0aW9ucy5cbkNsdXN0ZXJMYXllci5tZXJnZU9wdGlvbnMob3B0aW9ucyk7XG5cbi8vIHJlZ2lzdGVyIENsdXN0ZXJMYXllcidzIEpTT04gdHlwZSBmb3IgSlNPTiBkZXNlcmlhbGl6YXRpb24uXG5DbHVzdGVyTGF5ZXIucmVnaXN0ZXJKU09OVHlwZSgnQ2x1c3RlckxheWFlcicpO1xuXG4vLyBmdW5jdGlvbiBnZXRHcmFkaWVudChjb2xvcikge1xuLy8gICAgIHJldHVybiAncmdiYSgnICsgY29sb3Iuam9pbigpICsgJywgMSknO1xuLy8gICAgIHJldHVybiB7XG4vLyAgICAgICAgIHR5cGUgOiAncmFkaWFsJyxcbi8vICAgICAgICAgY29sb3JTdG9wcyA6IFtcbi8vICAgICAgICAgICAgIFswLjAwLCAncmdiYSgnICsgY29sb3Iuam9pbigpICsgJywgMCknXSxcbi8vICAgICAgICAgICAgIFswLjUwLCAncmdiYSgnICsgY29sb3Iuam9pbigpICsgJywgMSknXSxcbi8vICAgICAgICAgICAgIFsxLjAwLCAncmdiYSgnICsgY29sb3Iuam9pbigpICsgJywgMSknXVxuLy8gICAgICAgICBdXG4vLyAgICAgfTtcbi8vIH1cblxuY29uc3QgZGVmYXVsdFRleHRTeW1ib2wgPSB7XG4gICAgJ3RleHRGYWNlTmFtZScgICAgICA6ICdcIm1pY3Jvc29mdCB5YWhlaVwiJyxcbiAgICAndGV4dFNpemUnICAgICAgICAgIDogMTZcbn07XG5cbmNvbnN0IGRlZmF1bHRTeW1ib2wgPSB7XG4gICAgJ21hcmtlclR5cGUnIDogJ2VsbGlwc2UnLFxuICAgICdtYXJrZXJGaWxsJyA6IHsgcHJvcGVydHk6J2NvdW50JywgdHlwZTonaW50ZXJ2YWwnLCBzdG9wczogW1swLCAncmdiKDEzNSwgMTk2LCAyNDApJ10sIFs5LCAnIzFiYmM5YiddLCBbOTksICdyZ2IoMjE2LCAxMTUsIDE0OSknXV0gfSxcbiAgICAnbWFya2VyRmlsbE9wYWNpdHknIDogMC43LFxuICAgICdtYXJrZXJMaW5lT3BhY2l0eScgOiAxLFxuICAgICdtYXJrZXJMaW5lV2lkdGgnIDogMyxcbiAgICAnbWFya2VyTGluZUNvbG9yJyA6ICcjZmZmJyxcbiAgICAnbWFya2VyV2lkdGgnIDogeyBwcm9wZXJ0eTonY291bnQnLCB0eXBlOidpbnRlcnZhbCcsIHN0b3BzOiBbWzAsIDQwXSwgWzksIDYwXSwgWzk5LCA4MF1dIH0sXG4gICAgJ21hcmtlckhlaWdodCcgOiB7IHByb3BlcnR5Oidjb3VudCcsIHR5cGU6J2ludGVydmFsJywgc3RvcHM6IFtbMCwgNDBdLCBbOSwgNjBdLCBbOTksIDgwXV0gfVxufTtcblxuQ2x1c3RlckxheWVyLnJlZ2lzdGVyUmVuZGVyZXIoJ2NhbnZhcycsIGNsYXNzIGV4dGVuZHMgbWFwdGFsa3MucmVuZGVyZXIuT3ZlcmxheUxheWVyQ2FudmFzUmVuZGVyZXIge1xuXG4gICAgY29uc3RydWN0b3IobGF5ZXIpIHtcbiAgICAgICAgc3VwZXIobGF5ZXIpO1xuICAgICAgICBjb25zdCBpZCA9IG1hcHRhbGtzLklOVEVSTkFMX0xBWUVSX1BSRUZJWCArICdfY2x1c3Rlcl8nICsgbWFwdGFsa3MuVXRpbC5HVUlEKCk7XG4gICAgICAgIHRoaXMuX21hcmtlckxheWVyID0gbmV3IG1hcHRhbGtzLlZlY3RvckxheWVyKGlkKS5hZGRUbyhsYXllci5nZXRNYXAoKSk7XG4gICAgICAgIHZhciBhbGxJZCA9IG1hcHRhbGtzLklOVEVSTkFMX0xBWUVSX1BSRUZJWCArICdfY2x1c3Rlcl9hbGxfJyArIG1hcHRhbGtzLlV0aWwuR1VJRCgpO1xuICAgICAgICB0aGlzLl9hbGxNYXJrZXJMYXllciA9IG5ldyBtYXB0YWxrcy5WZWN0b3JMYXllcihhbGxJZCwgeyAndmlzaWJsZScgOiBmYWxzZSB9KS5hZGRUbyhsYXllci5nZXRNYXAoKSk7XG4gICAgICAgIHRoaXMuX2FuaW1hdGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fcmVmcmVzaFN0eWxlKCk7XG4gICAgICAgIHRoaXMuX25lZWRSZWRyYXcgPSB0cnVlO1xuICAgIH1cblxuICAgIGNoZWNrUmVzb3VyY2VzKCkge1xuICAgICAgICB2YXIgcmVzb3VyY2VzID0gc3VwZXIuY2hlY2tSZXNvdXJjZXMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIHJlcyA9IG1hcHRhbGtzLlV0aWwuZ2V0RXh0ZXJuYWxSZXNvdXJjZXModGhpcy5sYXllci5vcHRpb25zWydzeW1ib2wnXSB8fCBkZWZhdWx0U3ltYm9sLCB0cnVlKTtcbiAgICAgICAgaWYgKHJlcykge1xuICAgICAgICAgICAgcmVzb3VyY2VzLnB1c2guYXBwbHkocmVzb3VyY2VzLCByZXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXNvdXJjZXM7XG4gICAgfVxuXG4gICAgZHJhdygpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNhbnZhcykge1xuICAgICAgICAgICAgdGhpcy5wcmVwYXJlQ2FudmFzKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1hcCA9IHRoaXMuZ2V0TWFwKCk7XG4gICAgICAgIHZhciB6b29tID0gbWFwLmdldFpvb20oKTtcbiAgICAgICAgdmFyIG1hcmtlclN5bWJvbCA9IHRoaXMubGF5ZXIub3B0aW9uc1snbWFya2VyU3ltYm9sJ107XG4gICAgICAgIHZhciBtYXhDbHVzdGVyWm9vbSA9IHRoaXMubGF5ZXIub3B0aW9uc1snbWF4Q2x1c3Rlclpvb20nXTtcbiAgICAgICAgaWYgKG1heENsdXN0ZXJab29tICYmICB6b29tID4gbWF4Q2x1c3Rlclpvb20pIHtcbiAgICAgICAgICAgIHRoaXMucHJlcGFyZUNhbnZhcygpO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2N1cnJlbnRDbHVzdGVycztcbiAgICAgICAgICAgIHRoaXMuX21hcmtlckxheWVyLmNsZWFyKCk7XG4gICAgICAgICAgICBpZiAodGhpcy5fYWxsTWFya2VyTGF5ZXIuZ2V0Q291bnQoKSAhPT0gdGhpcy5sYXllci5nZXRDb3VudCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWxsTWFya2VyTGF5ZXIuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICB2YXIgY29weU1hcmtlcnMgPSBbXTtcbiAgICAgICAgICAgICAgICB0aGlzLmxheWVyLmZvckVhY2goZnVuY3Rpb24gKGcpIHtcbiAgICAgICAgICAgICAgICAgICAgY29weU1hcmtlcnMucHVzaChnLmNvcHkoKS5zZXRTeW1ib2wobWFya2VyU3ltYm9sKS5jb3B5RXZlbnRMaXN0ZW5lcnMoZykpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuX2FsbE1hcmtlckxheWVyLmFkZEdlb21ldHJ5KGNvcHlNYXJrZXJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2FsbE1hcmtlckxheWVyLnNob3coKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9hbGxNYXJrZXJMYXllci5oaWRlKCk7XG4gICAgICAgIGlmICh0aGlzLl9uZWVkUmVkcmF3KSB7XG4gICAgICAgICAgICB0aGlzLl9jbGVhckRhdGFDYWNoZSgpO1xuICAgICAgICAgICAgdGhpcy5fY29tcHV0ZUdyaWQoKTtcbiAgICAgICAgICAgIHRoaXMuX25lZWRSZWRyYXcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgem9vbUNsdXN0ZXJzID0gdGhpcy5fY2x1c3RlckNhY2hlW3pvb21dID8gdGhpcy5fY2x1c3RlckNhY2hlW3pvb21dWydjbHVzdGVycyddIDogbnVsbDtcbiAgICAgICAgdmFyIGV4dGVudCA9IG1hcC5nZXRDb250YWluZXJFeHRlbnQoKSxcbiAgICAgICAgICAgIG1hcmtlciwgbWFya2VycyA9IFtdLCBjbHVzdGVycyA9IFtdLFxuICAgICAgICAgICAgcHQsIHBFeHQsIHNwcml0ZSwgd2lkdGgsIGhlaWdodCwgZm9udDtcbiAgICAgICAgZm9yICh2YXIgcCBpbiB6b29tQ2x1c3RlcnMpIHtcbiAgICAgICAgICAgIHRoaXMuX2N1cnJlbnRHcmlkID0gem9vbUNsdXN0ZXJzW3BdO1xuICAgICAgICAgICAgaWYgKHpvb21DbHVzdGVyc1twXVsnY291bnQnXSA9PT0gMSkge1xuICAgICAgICAgICAgICAgIG1hcmtlciA9IHpvb21DbHVzdGVyc1twXVsnY2hpbGRyZW4nXVswXS5jb3B5KCkuc2V0U3ltYm9sKG1hcmtlclN5bWJvbCkuY29weUV2ZW50TGlzdGVuZXJzKHpvb21DbHVzdGVyc1twXVsnY2hpbGRyZW4nXVswXSk7XG4gICAgICAgICAgICAgICAgbWFya2VyLl9jbHVzdGVyID0gem9vbUNsdXN0ZXJzW3BdO1xuICAgICAgICAgICAgICAgIG1hcmtlcnMucHVzaChtYXJrZXIpO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ByaXRlID0gdGhpcy5fZ2V0U3ByaXRlKCk7XG4gICAgICAgICAgICB3aWR0aCA9IHNwcml0ZS5jYW52YXMud2lkdGg7XG4gICAgICAgICAgICBoZWlnaHQgPSBzcHJpdGUuY2FudmFzLmhlaWdodDtcbiAgICAgICAgICAgIHB0ID0gbWFwLl9wcmpUb0NvbnRhaW5lclBvaW50KHpvb21DbHVzdGVyc1twXVsnY2VudGVyJ10pO1xuICAgICAgICAgICAgcEV4dCA9IG5ldyBtYXB0YWxrcy5Qb2ludEV4dGVudChwdC5zdWJzdHJhY3Qod2lkdGgsIGhlaWdodCksIHB0LmFkZCh3aWR0aCwgaGVpZ2h0KSk7XG4gICAgICAgICAgICBpZiAoIWV4dGVudC5pbnRlcnNlY3RzKHBFeHQpKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb250ID0gbWFwdGFsa3MuVXRpbC5nZXRGb250KHRoaXMuX3RleHRTeW1ib2wpO1xuICAgICAgICAgICAgaWYgKCF6b29tQ2x1c3RlcnNbcF1bJ3RleHRTaXplJ10pIHtcbiAgICAgICAgICAgICAgICB6b29tQ2x1c3RlcnNbcF1bJ3RleHRTaXplJ10gPSBtYXB0YWxrcy5VdGlsLnN0cmluZ0xlbmd0aCh6b29tQ2x1c3RlcnNbcF1bJ2NvdW50J10sIGZvbnQpLnRvUG9pbnQoKS5fbXVsdGkoMSAvIDIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2x1c3RlcnMucHVzaCh6b29tQ2x1c3RlcnNbcF0pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2RyYXdMYXllcihjbHVzdGVycywgbWFya2Vycyk7XG4gICAgfVxuXG4gICAgZHJhd09uWm9vbWluZygpIHtcbiAgICAgICAgaWYgKHRoaXMuX2N1cnJlbnRDbHVzdGVycykge1xuICAgICAgICAgICAgdGhpcy5fZHJhd0NsdXN0ZXJzKHRoaXMuX2N1cnJlbnRDbHVzdGVycywgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvbkdlb21ldHJ5QWRkKCkge1xuICAgICAgICB0aGlzLl9uZWVkUmVkcmF3ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG5cbiAgICBvbkdlb21ldHJ5UmVtb3ZlKCkge1xuICAgICAgICB0aGlzLl9uZWVkUmVkcmF3ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG5cbiAgICBvbkdlb21ldHJ5UG9zaXRpb25DaGFuZ2UoKSB7XG4gICAgICAgIHRoaXMuX25lZWRSZWRyYXcgPSB0cnVlO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIG9uUmVtb3ZlKCkge1xuICAgICAgICB0aGlzLl9jbGVhckRhdGFDYWNoZSgpO1xuICAgICAgICB0aGlzLl9tYXJrZXJMYXllci5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5fYWxsTWFya2VyTGF5ZXIucmVtb3ZlKCk7XG4gICAgfVxuXG4gICAgc2hvdygpIHtcbiAgICAgICAgdGhpcy5fbWFya2VyTGF5ZXIuc2hvdygpO1xuICAgICAgICB0aGlzLl9hbGxNYXJrZXJMYXllci5zaG93KCk7XG4gICAgICAgIG1hcHRhbGtzLnJlbmRlcmVyLkNhbnZhc1JlbmRlcmVyLnByb3RvdHlwZS5zaG93LmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgaGlkZSgpIHtcbiAgICAgICAgdGhpcy5fbWFya2VyTGF5ZXIuaGlkZSgpO1xuICAgICAgICB0aGlzLl9hbGxNYXJrZXJMYXllci5oaWRlKCk7XG4gICAgICAgIG1hcHRhbGtzLnJlbmRlcmVyLkNhbnZhc1JlbmRlcmVyLnByb3RvdHlwZS5oaWRlLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgc2V0WkluZGV4KHopIHtcbiAgICAgICAgdGhpcy5fbWFya2VyTGF5ZXIuc2V0WkluZGV4KHopO1xuICAgICAgICB0aGlzLl9hbGxNYXJrZXJMYXllci5zZXRaSW5kZXgoeik7XG4gICAgICAgIG1hcHRhbGtzLnJlbmRlcmVyLkNhbnZhc1JlbmRlcmVyLnByb3RvdHlwZS5zZXRaSW5kZXguY2FsbCh0aGlzLCB6KTtcbiAgICB9XG5cbiAgICB0cmFuc2Zvcm0obWF0cml4KSB7XG4gICAgICAgIGlmICh0aGlzLl9jdXJyZW50Q2x1c3RlcnMpIHtcbiAgICAgICAgICAgIHRoaXMuX2RyYXdDbHVzdGVycyh0aGlzLl9jdXJyZW50Q2x1c3RlcnMsIDEsIG1hdHJpeCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG5cbiAgICBpZGVudGlmeShwb2ludCkge1xuICAgICAgICB2YXIgbWFwID0gdGhpcy5nZXRNYXAoKTtcbiAgICAgICAgcG9pbnQgPSBtYXAuX3BvaW50VG9Db250YWluZXJQb2ludChwb2ludCk7XG4gICAgICAgIGlmICghdGhpcy5fY3VycmVudENsdXN0ZXJzKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgb2xkID0gdGhpcy5fY3VycmVudEdyaWQ7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY3VycmVudENsdXN0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYyA9IHRoaXMuX2N1cnJlbnRDbHVzdGVyc1tpXTtcbiAgICAgICAgICAgIHZhciBwdCA9IG1hcC5fcHJqVG9Db250YWluZXJQb2ludChjWydjZW50ZXInXSk7XG4gICAgICAgICAgICB0aGlzLl9jdXJyZW50R3JpZCA9IGM7XG4gICAgICAgICAgICB2YXIgbWFya2VyV2lkdGggPSB0aGlzLl9nZXRTcHJpdGUoKS5jYW52YXMud2lkdGg7XG5cbiAgICAgICAgICAgIGlmIChwb2ludC5kaXN0YW5jZVRvKHB0KSA8PSBtYXJrZXJXaWR0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICdjZW50ZXInICAgOiBtYXAuZ2V0UHJvamVjdGlvbigpLnVucHJvamVjdChjLmNlbnRlci5jb3B5KCkpLFxuICAgICAgICAgICAgICAgICAgICAnY2hpbGRyZW4nIDogYy5jaGlsZHJlbi5zbGljZSgwKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY3VycmVudEdyaWQgPSBvbGQ7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIG9uU3ltYm9sQ2hhbmdlZCgpIHtcbiAgICAgICAgdGhpcy5fcmVmcmVzaFN0eWxlKCk7XG4gICAgICAgIHRoaXMuX2NvbXB1dGVHcmlkKCk7XG4gICAgICAgIHRoaXMuX3N0b3BBbmltKCk7XG4gICAgICAgIHRoaXMuZHJhdygpO1xuICAgIH1cblxuICAgIGlzVXBkYXRlV2hlblpvb21pbmcoKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIF9yZWZyZXNoU3R5bGUoKSB7XG4gICAgICAgIHZhciBzeW1ib2wgPSB0aGlzLmxheWVyLm9wdGlvbnNbJ3N5bWJvbCddIHx8IGRlZmF1bHRTeW1ib2w7XG4gICAgICAgIHZhciB0ZXh0U3ltYm9sID0gdGhpcy5sYXllci5vcHRpb25zWyd0ZXh0U3ltYm9sJ10gfHwgZGVmYXVsdFRleHRTeW1ib2w7XG4gICAgICAgIC8vIHZhciBzeW1ib2xpemVyID0gbWFwdGFsa3Muc3ltYm9saXplci5WZWN0b3JNYXJrZXJTeW1ib2xpemVyO1xuICAgICAgICAvLyB2YXIgc3R5bGUgPSBzeW1ib2xpemVyLnRyYW5zbGF0ZUxpbmVBbmRGaWxsKHN5bWJvbCk7XG4gICAgICAgIHZhciBhcmdGbiA9ICAoKSA9PiBbdGhpcy5nZXRNYXAoKS5nZXRab29tKCksIHRoaXMuX2N1cnJlbnRHcmlkXTtcbiAgICAgICAgLy8gdGhpcy5fc3R5bGUgPSBtYXB0YWxrcy5NYXBib3hVdGlsLmxvYWRGdW5jdGlvblR5cGVzKHN0eWxlLCBhcmdGbik7XG4gICAgICAgIHRoaXMuX3N5bWJvbCA9IG1hcHRhbGtzLk1hcGJveFV0aWwubG9hZEZ1bmN0aW9uVHlwZXMoc3ltYm9sLCBhcmdGbik7XG4gICAgICAgIHRoaXMuX3RleHRTeW1ib2wgPSBtYXB0YWxrcy5NYXBib3hVdGlsLmxvYWRGdW5jdGlvblR5cGVzKHRleHRTeW1ib2wsIGFyZ0ZuKTtcbiAgICB9XG5cbiAgICBfZHJhd0xheWVyKGNsdXN0ZXJzLCBtYXJrZXJzLCBtYXRyaXgpIHtcbiAgICAgICAgdGhpcy5fY3VycmVudENsdXN0ZXJzID0gY2x1c3RlcnM7XG4gICAgICAgIGNvbnN0IGxheWVyID0gdGhpcy5sYXllcjtcbiAgICAgICAgaWYgKGxheWVyLm9wdGlvbnNbJ2FuaW1hdGlvbiddICYmIHRoaXMuX2FuaW1hdGVkICYmIHRoaXMuX2lub3V0ID09PSAnb3V0Jykge1xuICAgICAgICAgICAgdGhpcy5fcGxheWVyID0gbWFwdGFsa3MuYW5pbWF0aW9uLkFuaW1hdGlvbi5hbmltYXRlKFxuICAgICAgICAgICAgICAgIHsgJ2QnIDogWzAsIDFdIH0sXG4gICAgICAgICAgICAgICAgeyAnc3BlZWQnIDogbGF5ZXIub3B0aW9uc1snYW5pbWF0aW9uRHVyYXRpb24nXSwgJ2Vhc2luZycgOiAnaW5BbmRPdXQnIH0sXG4gICAgICAgICAgICAgICAgZnJhbWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnJhbWUuc3RhdGUucGxheVN0YXRlID09PSAnZmluaXNoZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5fbWFya2VyTGF5ZXIuZ2V0Q291bnQoKSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9tYXJrZXJMYXllci5jbGVhcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbWFya2VyTGF5ZXIuYWRkR2VvbWV0cnkobWFya2Vycyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hbmltYXRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21wbGV0ZVJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZHJhd0NsdXN0ZXJzKGNsdXN0ZXJzLCBmcmFtZS5zdHlsZXMuZCwgbWF0cml4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdE1hcFRvUmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApXG4gICAgICAgICAgICAucGxheSgpO1xuICAgICAgICAgICAgdGhpcy5fZHJhd0NsdXN0ZXJzKGNsdXN0ZXJzLCAwLCBtYXRyaXgpO1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0TWFwVG9SZW5kZXIoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2RyYXdDbHVzdGVycyhjbHVzdGVycywgMSwgbWF0cml4KTtcbiAgICAgICAgICAgIGlmICghbWF0cml4ICYmICh0aGlzLl9hbmltYXRlZCB8fCB0aGlzLl9tYXJrZXJMYXllci5nZXRDb3VudCgpID09PSAwKSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9tYXJrZXJMYXllci5nZXRDb3VudCgpID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9tYXJrZXJMYXllci5jbGVhcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl9tYXJrZXJMYXllci5hZGRHZW9tZXRyeShtYXJrZXJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2FuaW1hdGVkID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmNvbXBsZXRlUmVuZGVyKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBfZHJhd0NsdXN0ZXJzKGNsdXN0ZXJzLCByYXRpbywgbWF0cml4KSB7XG4gICAgICAgIG1hdHJpeCA9IG1hdHJpeCA/IG1hdHJpeFsnY29udGFpbmVyJ10gOiBudWxsO1xuICAgICAgICB0aGlzLnByZXBhcmVDYW52YXMoKTtcbiAgICAgICAgdmFyIG1hcCA9IHRoaXMuZ2V0TWFwKCksXG4gICAgICAgICAgICBkcmF3biA9IHt9O1xuICAgICAgICBjbHVzdGVycy5mb3JFYWNoKGMgPT4ge1xuICAgICAgICAgICAgaWYgKGMucGFyZW50KSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcmVudCA9IG1hcC5fcHJqVG9Db250YWluZXJQb2ludChjLnBhcmVudFsnY2VudGVyJ10pO1xuICAgICAgICAgICAgICAgIGlmICghZHJhd25bYy5wYXJlbnQua2V5XSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobWF0cml4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQgPSBtYXRyaXguYXBwbHlUb1BvaW50SW5zdGFuY2UocGFyZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkcmF3bltjLnBhcmVudC5rZXldID0gMTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZHJhd0NsdXN0ZXIocGFyZW50LCBjLnBhcmVudCwgMSAtIHJhdGlvKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAocmF0aW8gPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjbHVzdGVycy5mb3JFYWNoKGMgPT4ge1xuICAgICAgICAgICAgdmFyIHB0ID0gbWFwLl9wcmpUb0NvbnRhaW5lclBvaW50KGNbJ2NlbnRlciddKTtcbiAgICAgICAgICAgIGlmIChjLnBhcmVudCkge1xuICAgICAgICAgICAgICAgIHZhciBwYXJlbnQgPSBtYXAuX3ByalRvQ29udGFpbmVyUG9pbnQoYy5wYXJlbnRbJ2NlbnRlciddKTtcbiAgICAgICAgICAgICAgICBwdCA9IHBhcmVudC5hZGQocHQuc3Vic3RyYWN0KHBhcmVudCkuX211bHRpKHJhdGlvKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWF0cml4KSB7XG4gICAgICAgICAgICAgICAgcHQgPSBtYXRyaXguYXBwbHlUb1BvaW50SW5zdGFuY2UocHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fZHJhd0NsdXN0ZXIocHQsIGMsIHJhdGlvID4gMC41ID8gMSA6IHJhdGlvKTtcbiAgICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBfZHJhd0NsdXN0ZXIocHQsIGdyaWQsIG9wKSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRHcmlkID0gZ3JpZDtcbiAgICAgICAgdmFyIGN0eCA9IHRoaXMuY29udGV4dDtcbiAgICAgICAgdmFyIHNwcml0ZSA9IHRoaXMuX2dldFNwcml0ZSgpO1xuICAgICAgICB2YXIgb3BhY2l0eSA9IGN0eC5nbG9iYWxBbHBoYTtcbiAgICAgICAgaWYgKG9wYWNpdHkgKiBvcCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IG9wYWNpdHkgKiBvcDtcbiAgICAgICAgaWYgKHNwcml0ZSkge1xuICAgICAgICAgICAgdmFyIHBvcyA9IHB0LmFkZChzcHJpdGUub2Zmc2V0KS5fc3Vic3RyYWN0KHNwcml0ZS5jYW52YXMud2lkdGggLyAyLCBzcHJpdGUuY2FudmFzLmhlaWdodCAvIDIpO1xuICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShzcHJpdGUuY2FudmFzLCBwb3MueCwgcG9zLnkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMubGF5ZXIub3B0aW9uc1snZHJhd0NsdXN0ZXJUZXh0J10gJiYgZ3JpZFsndGV4dFNpemUnXSkge1xuICAgICAgICAgICAgbWFwdGFsa3MuQ2FudmFzLnByZXBhcmVDYW52YXNGb250KGN0eCwgdGhpcy5fdGV4dFN5bWJvbCk7XG4gICAgICAgICAgICBtYXB0YWxrcy5DYW52YXMuZmlsbFRleHQoY3R4LCBncmlkWydjb3VudCddLCBwdC5zdWJzdHJhY3QoZ3JpZFsndGV4dFNpemUnXSkpO1xuICAgICAgICB9XG4gICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IG9wYWNpdHk7XG4gICAgfVxuXG4gICAgX2dldFNwcml0ZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9zcHJpdGVDYWNoZSkge1xuICAgICAgICAgICAgdGhpcy5fc3ByaXRlQ2FjaGUgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICB2YXIga2V5ID0gbWFwdGFsa3MuVXRpbC5nZXRTeW1ib2xTdGFtcCh0aGlzLl9zeW1ib2wpO1xuICAgICAgICBpZiAoIXRoaXMuX3Nwcml0ZUNhY2hlW2tleV0pIHtcbiAgICAgICAgICAgIHRoaXMuX3Nwcml0ZUNhY2hlW2tleV0gPSBuZXcgbWFwdGFsa3MuTWFya2VyKFswLCAwXSwgeyAnc3ltYm9sJyA6IHRoaXMuX3N5bWJvbCB9KS5fZ2V0U3ByaXRlKHRoaXMucmVzb3VyY2VzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fc3ByaXRlQ2FjaGVba2V5XTtcbiAgICB9XG5cbiAgICBfaW5pdEdyaWRTeXN0ZW0oKSB7XG4gICAgICAgIHZhciBleHRlbnQsIHBvaW50cyA9IFtdO1xuICAgICAgICB2YXIgYztcbiAgICAgICAgdGhpcy5sYXllci5mb3JFYWNoKGcgPT4ge1xuICAgICAgICAgICAgYyA9IGcuX2dldFByakNvb3JkaW5hdGVzKCk7XG4gICAgICAgICAgICBpZiAoIWV4dGVudCkge1xuICAgICAgICAgICAgICAgIGV4dGVudCA9IGcuX2dldFByakV4dGVudCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHRlbnQgPSBleHRlbnQuX2NvbWJpbmUoZy5fZ2V0UHJqRXh0ZW50KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcG9pbnRzLnB1c2goe1xuICAgICAgICAgICAgICAgIHggOiBjLngsXG4gICAgICAgICAgICAgICAgeSA6IGMueSxcbiAgICAgICAgICAgICAgICBpZCA6IGcuX2dldEludGVybmFsSWQoKSxcbiAgICAgICAgICAgICAgICBnZW9tZXRyeSA6IGdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fbWFya2VyRXh0ZW50ID0gZXh0ZW50O1xuICAgICAgICB0aGlzLl9tYXJrZXJQb2ludHMgPSBwb2ludHM7XG4gICAgfVxuXG4gICAgX2NvbXB1dGVHcmlkKCkge1xuICAgICAgICB2YXIgbWFwID0gdGhpcy5nZXRNYXAoKSxcbiAgICAgICAgICAgIHpvb20gPSBtYXAuZ2V0Wm9vbSgpO1xuICAgICAgICBpZiAoIXRoaXMuX21hcmtlckV4dGVudCkge1xuICAgICAgICAgICAgdGhpcy5faW5pdEdyaWRTeXN0ZW0oKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuX2NsdXN0ZXJDYWNoZSkge1xuICAgICAgICAgICAgdGhpcy5fY2x1c3RlckNhY2hlID0ge307XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHByZSA9IG1hcC5fZ2V0UmVzb2x1dGlvbihtYXAuZ2V0TWluWm9vbSgpKSA+IG1hcC5fZ2V0UmVzb2x1dGlvbihtYXAuZ2V0TWF4Wm9vbSgpKSA/IHpvb20gLSAxIDogem9vbSArIDE7XG4gICAgICAgIGlmICh0aGlzLl9jbHVzdGVyQ2FjaGVbcHJlXSAmJiB0aGlzLl9jbHVzdGVyQ2FjaGVbcHJlXS5sZW5ndGggPT09IHRoaXMubGF5ZXIuZ2V0Q291bnQoKSkge1xuICAgICAgICAgICAgdGhpcy5fY2x1c3RlckNhY2hlW3pvb21dID0gdGhpcy5fY2x1c3RlckNhY2hlW3ByZV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLl9jbHVzdGVyQ2FjaGVbem9vbV0pIHtcbiAgICAgICAgICAgIHRoaXMuX2NsdXN0ZXJDYWNoZVt6b29tXSA9IHRoaXMuX2NvbXB1dGVab29tR3JpZCh6b29tKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9jb21wdXRlWm9vbUdyaWQoem9vbSkge1xuICAgICAgICBpZiAoIXRoaXMuX21hcmtlckV4dGVudCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1hcCA9IHRoaXMuZ2V0TWFwKCksXG4gICAgICAgICAgICByID0gbWFwLl9nZXRSZXNvbHV0aW9uKHpvb20pICogdGhpcy5sYXllci5vcHRpb25zWydtYXhDbHVzdGVyUmFkaXVzJ10sXG4gICAgICAgICAgICBwcmVDYWNoZSA9IHRoaXMuX2NsdXN0ZXJDYWNoZVt6b29tIC0gMV0sXG4gICAgICAgICAgICBwcmVUID0gbWFwLl9nZXRSZXNvbHV0aW9uKHpvb20gLSAxKSA/IG1hcC5fZ2V0UmVzb2x1dGlvbih6b29tIC0gMSkgKiB0aGlzLmxheWVyLm9wdGlvbnNbJ21heENsdXN0ZXJSYWRpdXMnXSA6IG51bGw7XG4gICAgICAgIGlmICghcHJlQ2FjaGUgJiYgem9vbSAtIDEgPj0gbWFwLmdldE1pblpvb20oKSkge1xuICAgICAgICAgICAgdGhpcy5fY2x1c3RlckNhY2hlW3pvb20gLSAxXSA9IHByZUNhY2hlID0gdGhpcy5fY29tcHV0ZVpvb21HcmlkKHpvb20gLSAxKTtcbiAgICAgICAgfVxuICAgICAgICAvLyAxLiBmb3JtYXQgZXh0ZW50IG9mIG1hcmtlcnMgdG8gZ3JpZHMgd2l0aCByYWlkdXMgb2YgclxuICAgICAgICAvLyAyLiBmaW5kIHBvaW50J3MgZ3JpZCBpbiB0aGUgZ3JpZHNcbiAgICAgICAgLy8gMy4gc3VtIHVwIHRoZSBwb2ludCBpbnRvIHRoZSBncmlkJ3MgY29sbGVjdGlvblxuICAgICAgICB2YXIgcG9pbnRzID0gdGhpcy5fbWFya2VyUG9pbnRzO1xuICAgICAgICB2YXIgZ3JpZHMgPSB7fSxcbiAgICAgICAgICAgIG1pbiA9IHRoaXMuX21hcmtlckV4dGVudC5nZXRNaW4oKSxcbiAgICAgICAgICAgIGd4LCBneSwga2V5LFxuICAgICAgICAgICAgcGd4LCBwZ3ksIHBrZXk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwb2ludHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGd4ID0gTWF0aC5mbG9vcigocG9pbnRzW2ldLnggLSBtaW4ueCkgLyByKTtcbiAgICAgICAgICAgIGd5ID0gTWF0aC5mbG9vcigocG9pbnRzW2ldLnkgLSBtaW4ueSkgLyByKTtcbiAgICAgICAgICAgIGtleSA9IGd4ICsgJ18nICsgZ3k7XG4gICAgICAgICAgICBpZiAoIWdyaWRzW2tleV0pIHtcbiAgICAgICAgICAgICAgICBncmlkc1trZXldID0ge1xuICAgICAgICAgICAgICAgICAgICAnc3VtJyA6IG5ldyBtYXB0YWxrcy5Db29yZGluYXRlKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSksXG4gICAgICAgICAgICAgICAgICAgICdjZW50ZXInIDogbmV3IG1hcHRhbGtzLkNvb3JkaW5hdGUocG9pbnRzW2ldLngsIHBvaW50c1tpXS55KSxcbiAgICAgICAgICAgICAgICAgICAgJ2NvdW50JyA6IDEsXG4gICAgICAgICAgICAgICAgICAgICdjaGlsZHJlbicgOltwb2ludHNbaV0uZ2VvbWV0cnldLFxuICAgICAgICAgICAgICAgICAgICAna2V5JyA6IGtleSArICcnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAocHJlVCAmJiBwcmVDYWNoZSkge1xuICAgICAgICAgICAgICAgICAgICBwZ3ggPSBNYXRoLmZsb29yKChwb2ludHNbaV0ueCAtIG1pbi54KSAvIHByZVQpO1xuICAgICAgICAgICAgICAgICAgICBwZ3kgPSBNYXRoLmZsb29yKChwb2ludHNbaV0ueSAtIG1pbi55KSAvIHByZVQpO1xuICAgICAgICAgICAgICAgICAgICBwa2V5ID0gcGd4ICsgJ18nICsgcGd5O1xuICAgICAgICAgICAgICAgICAgICBncmlkc1trZXldWydwYXJlbnQnXSA9IHByZUNhY2hlWydjbHVzdGVyTWFwJ11bcGtleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBncmlkc1trZXldWydzdW0nXS5fYWRkKG5ldyBtYXB0YWxrcy5Db29yZGluYXRlKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSkpO1xuICAgICAgICAgICAgICAgIGdyaWRzW2tleV1bJ2NvdW50J10rKztcbiAgICAgICAgICAgICAgICBncmlkc1trZXldWydjZW50ZXInXSA9IGdyaWRzW2tleV1bJ3N1bSddLm11bHRpKDEgLyBncmlkc1trZXldWydjb3VudCddKTtcbiAgICAgICAgICAgICAgICBncmlkc1trZXldWydjaGlsZHJlbiddLnB1c2gocG9pbnRzW2ldLmdlb21ldHJ5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyByZXR1cm4ge1xuICAgICAgICAvLyAgICAgJ2NsdXN0ZXJzJyA6IGdyaWRzLFxuICAgICAgICAvLyAgICAgJ2NsdXN0ZXJNYXAnIDogZ3JpZHNcbiAgICAgICAgLy8gfTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21lcmdlQ2x1c3RlcnMoZ3JpZHMsIHIgLyAyKTtcbiAgICB9XG5cbiAgICBfbWVyZ2VDbHVzdGVycyhncmlkcywgcikge1xuICAgICAgICB2YXIgY2x1c3Rlck1hcCA9IHt9O1xuICAgICAgICB2YXIgcDtcbiAgICAgICAgZm9yIChwIGluIGdyaWRzKSB7XG4gICAgICAgICAgICBjbHVzdGVyTWFwW3BdID0gZ3JpZHNbcF07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBtZXJnZSBhZGphY2VudCBjbHVzdGVyc1xuICAgICAgICB2YXIgbWVyZ2luZyA9IHt9O1xuXG4gICAgICAgIHZhciB2aXNpdGVkID0ge307XG4gICAgICAgIC8vIGZpbmQgY2x1c3RlcnMgbmVlZCB0byBtZXJnZVxuICAgICAgICB2YXIgYzEsIGMyO1xuICAgICAgICBmb3IgKHAgaW4gZ3JpZHMpIHtcbiAgICAgICAgICAgIGMxID0gZ3JpZHNbcF07XG4gICAgICAgICAgICBpZiAodmlzaXRlZFtjMS5rZXldKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZ3hneSA9IGMxLmtleS5zcGxpdCgnXycpO1xuICAgICAgICAgICAgdmFyIGd4ID0gKyhneGd5WzBdKSxcbiAgICAgICAgICAgICAgICBneSA9ICsoZ3hneVsxXSk7XG4gICAgICAgICAgICAvL3RyYXZlcnNlIGFkamFjZW50IGdyaWRzXG4gICAgICAgICAgICBmb3IgKHZhciBpaSA9IC0xOyBpaSA8PSAxOyBpaSsrKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaWlpID0gLTE7IGlpaSA8PSAxOyBpaWkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaWkgPT09IDAgJiYgaWlpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIga2V5MiA9IChneCArIGlpKSArICdfJyArIChneSArIGlpaSk7XG4gICAgICAgICAgICAgICAgICAgIGMyID0gZ3JpZHNba2V5Ml07XG4gICAgICAgICAgICAgICAgICAgIGlmIChjMiAmJiB0aGlzLl9kaXN0YW5jZVRvKGMxWydjZW50ZXInXSwgYzJbJ2NlbnRlciddKSA8PSByKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1lcmdpbmdbYzEua2V5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lcmdpbmdbYzEua2V5XSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVyZ2luZ1tjMS5rZXldLnB1c2goYzIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlzaXRlZFtjMi5rZXldID0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vbWVyZ2UgY2x1c3RlcnNcbiAgICAgICAgZm9yICh2YXIgbSBpbiBtZXJnaW5nKSB7XG4gICAgICAgICAgICB2YXIgZ3JpZCA9IGdyaWRzW21dO1xuICAgICAgICAgICAgaWYgKCFncmlkKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdG9NZXJnZSA9IG1lcmdpbmdbbV07XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRvTWVyZ2UubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoZ3JpZHNbdG9NZXJnZVtpXS5rZXldKSB7XG4gICAgICAgICAgICAgICAgICAgIGdyaWRbJ3N1bSddLl9hZGQodG9NZXJnZVtpXS5zdW0pO1xuICAgICAgICAgICAgICAgICAgICBncmlkWydjb3VudCddICs9IHRvTWVyZ2VbaV0uY291bnQ7XG4gICAgICAgICAgICAgICAgICAgIGdyaWRbJ2NoaWxkcmVuJ10uY29uY2F0KHRvTWVyZ2VbaV0uZ2VvbWV0cnkpO1xuICAgICAgICAgICAgICAgICAgICBjbHVzdGVyTWFwW3RvTWVyZ2VbaV0ua2V5XSA9IGdyaWQ7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBncmlkc1t0b01lcmdlW2ldLmtleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZ3JpZFsnY2VudGVyJ10gPSBncmlkWydzdW0nXS5tdWx0aSgxIC8gZ3JpZFsnY291bnQnXSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgJ2NsdXN0ZXJzJyA6IGdyaWRzLFxuICAgICAgICAgICAgJ2NsdXN0ZXJNYXAnIDogY2x1c3Rlck1hcFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIF9kaXN0YW5jZVRvKGMxLCBjMikge1xuICAgICAgICB2YXIgeCA9IGMxLnggLSBjMi54LFxuICAgICAgICAgICAgeSA9IGMxLnkgLSBjMi55O1xuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHggKiB4ICsgeSAqIHkpO1xuICAgIH1cblxuICAgIF9zdG9wQW5pbSgpIHtcbiAgICAgICAgaWYgKHRoaXMuX3BsYXllciAmJiB0aGlzLl9wbGF5ZXIucGxheVN0YXRlICE9PSAnZmluaXNoZWQnKSB7XG4gICAgICAgICAgICB0aGlzLl9wbGF5ZXIuY2FuY2VsKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvblpvb21TdGFydChwYXJhbSkge1xuICAgICAgICB0aGlzLl9pbm91dCA9IHBhcmFtWydmcm9tJ10gPiBwYXJhbVsndG8nXSA/ICdpbicgOiAnb3V0JztcbiAgICAgICAgdmFyIG1heENsdXN0ZXJab29tID0gdGhpcy5sYXllci5vcHRpb25zWydtYXhDbHVzdGVyWm9vbSddO1xuICAgICAgICBpZiAobWF4Q2x1c3Rlclpvb20gJiYgcGFyYW1bJ3RvJ10gPD0gbWF4Q2x1c3Rlclpvb20pIHtcbiAgICAgICAgICAgIHRoaXMuX2FsbE1hcmtlckxheWVyLmhpZGUoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBpZiAodGhpcy5fbWFya2VyTGF5ZXIuZ2V0Q291bnQoKSA+IDApIHtcbiAgICAgICAgLy8gICAgIHRoaXMuX21hcmtlckxheWVyLmNsZWFyKCk7XG4gICAgICAgIC8vIH1cbiAgICAgICAgdGhpcy5fc3RvcEFuaW0oKTtcbiAgICB9XG5cbiAgICBvblpvb21FbmQoKSB7XG4gICAgICAgIHRoaXMuX2FuaW1hdGVkID0gdHJ1ZTtcbiAgICAgICAgLy8gaWYgKHRoaXMuX21hcmtlckxheWVyLmdldENvdW50KCkgPiAwKSB7XG5cbiAgICAgICAgLy8gfVxuICAgICAgICB0aGlzLl9jb21wdXRlR3JpZCgpO1xuICAgICAgICBtYXB0YWxrcy5yZW5kZXJlci5DYW52YXNSZW5kZXJlci5wcm90b3R5cGUub25ab29tRW5kLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgX2NsZWFyRGF0YUNhY2hlKCkge1xuICAgICAgICB0aGlzLl9zdG9wQW5pbSgpO1xuICAgICAgICB0aGlzLl9tYXJrZXJMYXllci5jbGVhcigpO1xuICAgICAgICBkZWxldGUgdGhpcy5fbWFya2VyRXh0ZW50O1xuICAgICAgICBkZWxldGUgdGhpcy5fbWFya2VyUG9pbnRzO1xuICAgICAgICBkZWxldGUgdGhpcy5fY2x1c3RlckNhY2hlO1xuICAgIH1cbn0pO1xuIl0sIm5hbWVzIjpbIm9wdGlvbnMiLCJDbHVzdGVyTGF5ZXIiLCJmcm9tSlNPTiIsImpzb24iLCJsYXllciIsImdlb0pTT05zIiwiZ2VvbWV0cmllcyIsImkiLCJsZW5ndGgiLCJnZW8iLCJtYXB0YWxrcyIsInB1c2giLCJhZGRHZW9tZXRyeSIsIm9uQ29uZmlnIiwiY29uZiIsImhhc093blByb3BlcnR5IiwiX2dldFJlbmRlcmVyIiwib25TeW1ib2xDaGFuZ2VkIiwiYWRkTWFya2VyIiwibWFya2VycyIsImxlbiIsIkVycm9yIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJpZGVudGlmeSIsInBvaW50IiwidG9KU09OIiwiY2FsbCIsIm1lcmdlT3B0aW9ucyIsInJlZ2lzdGVySlNPTlR5cGUiLCJkZWZhdWx0VGV4dFN5bWJvbCIsImRlZmF1bHRTeW1ib2wiLCJwcm9wZXJ0eSIsInR5cGUiLCJzdG9wcyIsInJlZ2lzdGVyUmVuZGVyZXIiLCJpZCIsIkdVSUQiLCJfbWFya2VyTGF5ZXIiLCJhZGRUbyIsImdldE1hcCIsImFsbElkIiwiX2FsbE1hcmtlckxheWVyIiwiX2FuaW1hdGVkIiwiX3JlZnJlc2hTdHlsZSIsIl9uZWVkUmVkcmF3IiwiY2hlY2tSZXNvdXJjZXMiLCJyZXNvdXJjZXMiLCJyZXMiLCJnZXRFeHRlcm5hbFJlc291cmNlcyIsImRyYXciLCJjYW52YXMiLCJwcmVwYXJlQ2FudmFzIiwibWFwIiwiem9vbSIsImdldFpvb20iLCJtYXJrZXJTeW1ib2wiLCJtYXhDbHVzdGVyWm9vbSIsIl9jdXJyZW50Q2x1c3RlcnMiLCJjbGVhciIsImdldENvdW50IiwiY29weU1hcmtlcnMiLCJmb3JFYWNoIiwiZyIsImNvcHkiLCJzZXRTeW1ib2wiLCJjb3B5RXZlbnRMaXN0ZW5lcnMiLCJzaG93IiwiaGlkZSIsIl9jbGVhckRhdGFDYWNoZSIsIl9jb21wdXRlR3JpZCIsInpvb21DbHVzdGVycyIsIl9jbHVzdGVyQ2FjaGUiLCJleHRlbnQiLCJnZXRDb250YWluZXJFeHRlbnQiLCJtYXJrZXIiLCJjbHVzdGVycyIsInB0IiwicEV4dCIsInNwcml0ZSIsIndpZHRoIiwiaGVpZ2h0IiwiZm9udCIsInAiLCJfY3VycmVudEdyaWQiLCJfY2x1c3RlciIsIl9nZXRTcHJpdGUiLCJfcHJqVG9Db250YWluZXJQb2ludCIsInN1YnN0cmFjdCIsImFkZCIsImludGVyc2VjdHMiLCJnZXRGb250IiwiX3RleHRTeW1ib2wiLCJzdHJpbmdMZW5ndGgiLCJ0b1BvaW50IiwiX211bHRpIiwiX2RyYXdMYXllciIsImRyYXdPblpvb21pbmciLCJfZHJhd0NsdXN0ZXJzIiwib25HZW9tZXRyeUFkZCIsInJlbmRlciIsIm9uR2VvbWV0cnlSZW1vdmUiLCJvbkdlb21ldHJ5UG9zaXRpb25DaGFuZ2UiLCJvblJlbW92ZSIsInJlbW92ZSIsIkNhbnZhc1JlbmRlcmVyIiwicHJvdG90eXBlIiwic2V0WkluZGV4IiwieiIsInRyYW5zZm9ybSIsIm1hdHJpeCIsIl9wb2ludFRvQ29udGFpbmVyUG9pbnQiLCJvbGQiLCJjIiwibWFya2VyV2lkdGgiLCJkaXN0YW5jZVRvIiwiZ2V0UHJvamVjdGlvbiIsInVucHJvamVjdCIsImNlbnRlciIsImNoaWxkcmVuIiwic2xpY2UiLCJfc3RvcEFuaW0iLCJpc1VwZGF0ZVdoZW5ab29taW5nIiwic3ltYm9sIiwidGV4dFN5bWJvbCIsImFyZ0ZuIiwiX3N5bWJvbCIsImxvYWRGdW5jdGlvblR5cGVzIiwiX2lub3V0IiwiX3BsYXllciIsIkFuaW1hdGlvbiIsImFuaW1hdGUiLCJmcmFtZSIsInN0YXRlIiwicGxheVN0YXRlIiwiY29tcGxldGVSZW5kZXIiLCJzdHlsZXMiLCJkIiwicmVxdWVzdE1hcFRvUmVuZGVyIiwicGxheSIsInJhdGlvIiwiZHJhd24iLCJwYXJlbnQiLCJrZXkiLCJhcHBseVRvUG9pbnRJbnN0YW5jZSIsIl9kcmF3Q2x1c3RlciIsImdyaWQiLCJvcCIsImN0eCIsImNvbnRleHQiLCJvcGFjaXR5IiwiZ2xvYmFsQWxwaGEiLCJwb3MiLCJvZmZzZXQiLCJfc3Vic3RyYWN0IiwiZHJhd0ltYWdlIiwieCIsInkiLCJwcmVwYXJlQ2FudmFzRm9udCIsImZpbGxUZXh0IiwiX3Nwcml0ZUNhY2hlIiwiZ2V0U3ltYm9sU3RhbXAiLCJfaW5pdEdyaWRTeXN0ZW0iLCJwb2ludHMiLCJfZ2V0UHJqQ29vcmRpbmF0ZXMiLCJfZ2V0UHJqRXh0ZW50IiwiX2NvbWJpbmUiLCJfZ2V0SW50ZXJuYWxJZCIsIl9tYXJrZXJFeHRlbnQiLCJfbWFya2VyUG9pbnRzIiwicHJlIiwiX2dldFJlc29sdXRpb24iLCJnZXRNaW5ab29tIiwiZ2V0TWF4Wm9vbSIsIl9jb21wdXRlWm9vbUdyaWQiLCJyIiwicHJlQ2FjaGUiLCJwcmVUIiwiZ3JpZHMiLCJtaW4iLCJnZXRNaW4iLCJneCIsImd5IiwicGd4IiwicGd5IiwicGtleSIsIk1hdGgiLCJmbG9vciIsImdlb21ldHJ5IiwiX2FkZCIsIm11bHRpIiwiX21lcmdlQ2x1c3RlcnMiLCJjbHVzdGVyTWFwIiwibWVyZ2luZyIsInZpc2l0ZWQiLCJjMSIsImMyIiwiZ3hneSIsInNwbGl0IiwiaWkiLCJpaWkiLCJrZXkyIiwiX2Rpc3RhbmNlVG8iLCJtIiwidG9NZXJnZSIsInN1bSIsImNvdW50IiwiY29uY2F0Iiwic3FydCIsImNhbmNlbCIsIm9uWm9vbVN0YXJ0IiwicGFyYW0iLCJvblpvb21FbmQiLCJPdmVybGF5TGF5ZXJDYW52YXNSZW5kZXJlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsQUFFQSxJQUFNQSxVQUFVO3dCQUNTLEdBRFQ7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
